import { Component } from '@angular/core';
import { ToastService } from '../../../core/services';

@Component({
  standalone: false,
  selector: 'app-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss'
})
export class ToastContainerComponent {
  constructor(public toasts: ToastService) {}
}
