
import { createHash, randomBytes } from "node:crypto";

import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/https";
import { onRequest } from "firebase-functions/v2/https";

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

setGlobalOptions({
  maxInstances: 10,
  region: "asia-southeast1"
});

initializeApp();

const auth = getAuth();
const db = getFirestore();

// =====================================
// EXISTING: CREATE FARMER ACCOUNT
// =====================================

export const createFarmerAccount = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Please sign in first."
      );
    }

    const staffDoc = await db
      .collection("users")
      .doc(request.auth.uid)
      .get();

    if (!staffDoc.exists || staffDoc.data()?.["role"] !== "staff") {
      throw new HttpsError(
        "permission-denied",
        "Only PTRI Staff can create farmer accounts."
      );
    }

    const { fullName, username, password, locality, phone } =
      request.data ?? {};

    if (
      typeof fullName !== "string" ||
      !fullName.trim() ||
      typeof username !== "string" ||
      !/^[a-zA-Z0-9._-]{3,30}$/.test(username.trim()) ||
      typeof password !== "string" ||
      password.length < 6
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Enter a valid name, username (3–30 characters), and password (at least 6 characters)."
      );
    }

    const normalizedUsername = username.trim().toLowerCase();

    const usernameRef = db
      .collection("farmerUsernames")
      .doc(normalizedUsername);

    const existingUsername = await usernameRef.get();

    if (existingUsername.exists) {
      throw new HttpsError(
        "already-exists",
        "That username is already taken."
      );
    }

    const internalEmail =
      `${normalizedUsername}@farmers.ptri-silk-system.invalid`;

    let createdUser;

    try {
      createdUser = await auth.createUser({
        email: internalEmail,
        password,
        displayName: fullName.trim()
      });

      await auth.setCustomUserClaims(createdUser.uid, {
        role: "farmer"
      });

      const batch = db.batch();

      batch.set(db.collection("users").doc(createdUser.uid), {
        fullName: fullName.trim(),
        username: normalizedUsername,
        email: internalEmail,
        role: "farmer",
        locality: typeof locality === "string" ? locality.trim() : "",
        phone: typeof phone === "string" ? phone.trim() : "",
        createdAt: new Date()
      });

      batch.set(usernameRef, {
        uid: createdUser.uid
      });

      await batch.commit();

      return {
        success: true,
        uid: createdUser.uid,
        username: normalizedUsername
      };

    } catch (error) {
      if (createdUser) {
        await auth.deleteUser(createdUser.uid).catch(() => undefined);
      }

      if (error instanceof HttpsError) {
        throw error;
      }

      console.error("Failed to create farmer account:", error);

      throw new HttpsError(
        "internal",
        "Unable to create the farmer account. Please try again."
      );
    }
  }
);

// =====================================
// SECURE TOKEN HELPERS
// =====================================

function generateCocoonReturnToken(): string {
  return randomBytes(32).toString("hex");
}

function hashCocoonReturnToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

// =====================================
// FARMER: SUBMIT COCOON RETURN
// Creates the return record and secure QR token.
// =====================================

export const submitCocoonReturn = onCall(
  { enforceAppCheck: false },
  async (request) => {

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Please sign in before submitting a cocoon return."
      );
    }

    const farmerUid = request.auth.uid;
    const { harvestId, returnDate } = request.data ?? {};

    if (
      typeof harvestId !== "string" ||
      !harvestId.trim() ||
      typeof returnDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(returnDate) ||
      Number.isNaN(Date.parse(`${returnDate}T00:00:00`))
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Please provide valid cocoon return information."
      );
    }

    const farmerDoc = await db
      .collection("users")
      .doc(farmerUid)
      .get();

    if (!farmerDoc.exists || farmerDoc.data()?.["role"] !== "farmer") {
      throw new HttpsError(
        "permission-denied",
        "Only farmer accounts can submit cocoon returns."
      );
    }

    const harvestRef = db
      .collection("cocoon-harvests")
      .doc(harvestId);

    const returnRef = db
      .collection("cocoon-returns")
      .doc();

    const token = generateCocoonReturnToken();
    const tokenHash = hashCocoonReturnToken(token);

    const now = new Date().toISOString();

    const returnNumber =
      `CR-${new Date().getFullYear()}-${returnRef.id.slice(-6).toUpperCase()}`;

    let newReturn: Record<string, unknown> | null = null;

    await db.runTransaction(async (transaction) => {

      const harvestSnapshot = await transaction.get(harvestRef);

      if (!harvestSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "The cocoon harvest record could not be found."
        );
      }

      const harvest = harvestSnapshot.data()!;

      if (harvest["farmerUid"] !== farmerUid) {
        throw new HttpsError(
          "permission-denied",
          "You are not authorized to return this cocoon harvest."
        );
      }

      if (harvest["returnStatus"] !== "Pending Return") {
        throw new HttpsError(
          "failed-precondition",
          "This harvest has already been submitted for return."
        );
      }

      if (returnDate < harvest["harvestDate"]) {
        throw new HttpsError(
          "invalid-argument",
          "Return date cannot be earlier than the harvest date."
        );
      }

      const record = {
        id: returnRef.id,
        returnNumber,

        harvestId: harvest["id"],
        harvestNumber: harvest["harvestNumber"],

        batchId: harvest["batchId"],
        batchNumber: harvest["batchNumber"],
        requestId: harvest["requestId"],
        requestNumber: harvest["requestNumber"],

        farmerUid,
        farmerName: harvest["farmerName"],

        harvestDate: harvest["harvestDate"],
        returnDate,
        cocoonWeight: harvest["harvestedWeight"],
        cocoonQuantity: harvest["cocoonQuantity"] ?? 0,
        cocoonCondition: harvest["cocoonCondition"],
        farmerRemarks: harvest["remarks"] || "",

        status: "Submitted",
        actualReceivedWeight: null,
        actualReceivedQuantity: null,
        ptriRemarks: "",

        createdAt: now
      };

      newReturn = record;

      transaction.set(returnRef, {
        ...record,
        tokenHash
      });

      transaction.update(harvestRef, {
        returnStatus: "Submitted",
        returnRecordIds: [
          ...(Array.isArray(harvest["returnRecordIds"])
            ? harvest["returnRecordIds"]
            : []),
          returnRef.id
        ]
      });
    });

    return {
      success: true,
      token,
      returnRecord: newReturn
    };
  }
);

// =====================================
// STAFF: REISSUE COCOON RETURN QR
// Generates a new secure token for an
// existing cocoon return record.
// Only authenticated PTRI Staff can use it.
// =====================================

export const reissueCocoonReturnQr = onCall(
  { enforceAppCheck: false },
  async (request) => {

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Please sign in before requesting a cocoon return QR code."
      );
    }

    // Verify the authenticated account is PTRI Staff.
    const staffDoc = await db
      .collection("users")
      .doc(request.auth.uid)
      .get();

    if (!staffDoc.exists || staffDoc.data()?.["role"] !== "staff") {
      throw new HttpsError(
        "permission-denied",
        "Only PTRI Staff can reissue cocoon return QR codes."
      );
    }

    const { returnId } = request.data ?? {};

    if (
      typeof returnId !== "string" ||
      !returnId.trim()
    ) {
      throw new HttpsError(
        "invalid-argument",
        "A valid cocoon return record ID is required."
      );
    }

    const returnRef = db
      .collection("cocoon-returns")
      .doc(returnId.trim());

    // Generate a new secure token.
    const token = generateCocoonReturnToken();
    const tokenHash = hashCocoonReturnToken(token);

    const issuedAt = new Date().toISOString();

    try {
      await db.runTransaction(async (transaction) => {

        const returnSnapshot = await transaction.get(returnRef);

        if (!returnSnapshot.exists) {
          throw new HttpsError(
            "not-found",
            "The cocoon return record could not be found."
          );
        }

        // Replace the previous token hash.
        // The previous QR token becomes invalid.
        transaction.update(returnRef, {
          tokenHash,
          qrTokenIssuedAt: issuedAt,
          qrTokenIssuedBy: request.auth!.uid
        });
      });

      // Return the raw token only to the authenticated staff caller.
      // Never store this token as plain text in Firestore.
      return {
        success: true,
        returnId: returnId.trim(),
        token,
        issuedAt
      };

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      console.error("Cocoon return QR reissue failed:", error);

      throw new HttpsError(
        "internal",
        "Unable to generate the cocoon return QR code. Please try again."
      );
    }
  }
);

// =====================================
// PUBLIC: GET COCOON RETURN DETAILS
// Read-only endpoint for Google Lens QR links.
// Returns only approved public fields.
// =====================================

export const getPublicCocoonReturn = onRequest(
  {
    cors: true,
    maxInstances: 10
  },
  async (req, res) => {

    res.set("Cache-Control", "no-store, max-age=0");

    if (req.method !== "GET") {
      res.status(405).json({
        success: false,
        message: "Method not allowed."
      });
      return;
    }

    const token = req.query["token"];

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid cocoon return QR code."
      });
      return;
    }

    try {
      const tokenHash = hashCocoonReturnToken(token);

      const snapshot = await db
        .collection("cocoon-returns")
        .where("tokenHash", "==", tokenHash)
        .limit(1)
        .get();

      if (snapshot.empty) {
        res.status(404).json({
          success: false,
          message: "Cocoon return record not found."
        });
        return;
      }

      const record = snapshot.docs[0].data();

      res.status(200).json({
        success: true,
        record: {
          returnNumber: record["returnNumber"] || "",
          harvestNumber: record["harvestNumber"] || "",
          batchNumber: record["batchNumber"] || "",
          requestNumber: record["requestNumber"] || "",
          harvestDate: record["harvestDate"] || "",
          returnDate: record["returnDate"] || "",
          cocoonWeight: record["cocoonWeight"] ?? 0,
          cocoonQuantity: record["cocoonQuantity"] ?? 0,
          cocoonCondition: record["cocoonCondition"] || "",
          status: record["status"] || "Submitted",
          createdAt: record["createdAt"] || ""
        }
      });

    } catch (error) {
      console.error("Public cocoon return lookup failed:", error);

      res.status(500).json({
        success: false,
        message: "Unable to retrieve cocoon return details."
      });
    }
  }
);
