
import { Component } from '@angular/core';
import {
  LucideAngularModule,
  Search,
  MessageCircle,
  Send,
  Paperclip,
  ArrowLeft,
  MoreVertical,
  CheckCheck,
  Clock3,
  UserRound,
  MessagesSquare,
  Plus,
  X,
  FileText,
  Image,
  Bell,
  Building2
} from 'lucide-angular';

@Component({
  selector: 'app-farmer-messages',
  imports: [LucideAngularModule],
  templateUrl: './farmer-messages.html',
  styleUrl: './farmer-messages.css',
})
export class FarmerMessages {
  readonly Search = Search;
  readonly MessageCircle = MessageCircle;
  readonly Send = Send;
  readonly Paperclip = Paperclip;
  readonly ArrowLeft = ArrowLeft;
  readonly MoreVertical = MoreVertical;
  readonly CheckCheck = CheckCheck;
  readonly Clock3 = Clock3;
  readonly UserRound = UserRound;
  readonly MessagesSquare = MessagesSquare;
  readonly Plus = Plus;
  readonly X = X;
  readonly FileText = FileText;
  readonly Image = Image;
  readonly Bell = Bell;
  readonly Building2 = Building2;
}
