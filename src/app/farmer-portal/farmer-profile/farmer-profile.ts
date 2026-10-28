
import { Component } from '@angular/core';
import {
  LucideAngularModule,
  UserRound,
  UserRoundPen,
  Sprout,
  MapPin,
  Phone,
  Mail,
  CalendarDays,
  ShieldCheck,
  Pencil,
  Save,
  X,
  Building2,
  BadgeCheck,
  CircleUserRound
} from 'lucide-angular';

@Component({
  selector: 'app-farmer-profile',
  imports: [LucideAngularModule],
  templateUrl: './farmer-profile.html',
  styleUrl: './farmer-profile.css',
})
export class FarmerProfile {
  readonly UserRound = UserRound;
  readonly UserRoundPen = UserRoundPen;
  readonly Sprout = Sprout;
  readonly MapPin = MapPin;
  readonly Phone = Phone;
  readonly Mail = Mail;
  readonly CalendarDays = CalendarDays;
  readonly ShieldCheck = ShieldCheck;
  readonly Pencil = Pencil;
  readonly Save = Save;
  readonly X = X;
  readonly Building2 = Building2;
  readonly BadgeCheck = BadgeCheck;
  readonly CircleUserRound = CircleUserRound;
}
