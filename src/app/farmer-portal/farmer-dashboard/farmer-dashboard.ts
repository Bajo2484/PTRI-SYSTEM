
import { Component } from '@angular/core';
import {
  LucideAngularModule,
  UserRound,
  Sprout,
  ClipboardList,
  Package,
  CheckCircle2,
  Plus,
  ArrowRight,
  ChevronRight
} from 'lucide-angular';

@Component({
  selector: 'app-farmer-dashboard',
  imports: [LucideAngularModule],
  templateUrl: './farmer-dashboard.html',
  styleUrl: './farmer-dashboard.css',
})
export class FarmerDashboard {
  readonly UserRound = UserRound;
  readonly Sprout = Sprout;
  readonly ClipboardList = ClipboardList;
  readonly Package = Package;
  readonly CheckCircle2 = CheckCircle2;
  readonly Plus = Plus;
  readonly ArrowRight = ArrowRight;
  readonly ChevronRight = ChevronRight;
}
