import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  @Input({ required: true }) title = '';
  @Input() width = 560;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  close(): void { this.closed.emit(); }
}
