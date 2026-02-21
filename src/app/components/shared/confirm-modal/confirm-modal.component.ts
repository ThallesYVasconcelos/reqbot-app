import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" [ngClass]="backdropClass()">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ title() }}</h3>
        <p class="text-gray-600 mb-6">{{ message() }}</p>
        <div class="flex gap-3 justify-end">
          <button
            (click)="cancel.emit()"
            class="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            {{ cancelLabel() }}
          </button>
          <button
            (click)="confirm.emit()"
            [class]="confirmClass()"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmModalComponent {
  title = input('Confirmar');
  message = input('Tem certeza?');
  confirmLabel = input('Confirmar');
  cancelLabel = input('Cancelar');
  variant = input<'danger' | 'primary'>('danger');
  backdropClass = input<string>('bg-black/50 backdrop-blur-sm');

  confirm = output<void>();
  cancel = output<void>();

  confirmClass(): string {
    const base = 'px-4 py-2 rounded-lg font-medium transition-colors';
    return this.variant() === 'danger'
      ? `${base} bg-red-600 hover:bg-red-700 text-white`
      : `${base} bg-blue-600 hover:bg-blue-700 text-white`;
  }
}
