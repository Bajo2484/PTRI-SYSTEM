
import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

setGlobalOptions({ maxInstances: 10 });

initializeApp();

const auth = getAuth();
const db = getFirestore();

export const createFarmerAccount = onCall(
  { enforceAppCheck: false },
  async (request) => {
    // Only signed-in PTRI Staff may create farmer accounts.
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

    // Internal email lets Firebase Authentication use username login.
    const internalEmail =
      `${normalizedUsername}@farmers.ptri-silk-system.invalid`;

    let createdUser;

    try {
      createdUser = await auth.createUser({
        email: internalEmail,
        password,
        displayName: fullName.trim(),
      });

      await auth.setCustomUserClaims(createdUser.uid, {
        role: "farmer",
      });

      const batch = db.batch();

      batch.set(db.collection("users").doc(createdUser.uid), {
        fullName: fullName.trim(),
        username: normalizedUsername,
        email: internalEmail,
        role: "farmer",
        locality: typeof locality === "string" ? locality.trim() : "",
        phone: typeof phone === "string" ? phone.trim() : "",
        createdAt: new Date(),
      });

      batch.set(usernameRef, {
        uid: createdUser.uid,
      });

      await batch.commit();

      return {
        success: true,
        uid: createdUser.uid,
        username: normalizedUsername,
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
