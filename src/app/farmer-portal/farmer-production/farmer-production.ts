
import { Component } from '@angular/core';
import {
  LucideAngularModule,
  Sprout,
  ClipboardList,
  Clock3,
  Plus,
  Leaf,
  Info,
  CalendarDays,
  Package,
  CheckCircle2,
  Eye
} from 'lucide-angular';

@Component({
  selector: 'app-farmer-production',
  imports: [LucideAngularModule],
  templateUrl: './farmer-production.html',
  styleUrl: './farmer-production.css',
})
export class FarmerProduction {
  readonly Sprout = Sprout;
  readonly ClipboardList = ClipboardList;
  readonly Clock3 = Clock3;
  readonly Plus = Plus;
  readonly Leaf = Leaf;
  readonly Info = Info;
  readonly CalendarDays = CalendarDays;
  readonly Package = Package;
  readonly CheckCircle2 = CheckCircle2;
  readonly Eye = Eye;
}
