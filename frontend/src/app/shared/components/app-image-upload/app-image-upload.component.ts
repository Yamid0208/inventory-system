import { Component, EventEmitter, Input, Output, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-image-upload.component.html'
})
export class AppImageUploadComponent implements OnChanges {
  @Input() label: string = 'Imagen de Referencia';
  @Input() currentImageUrl: string | null = null;
  @Input() inputId: string = 'product-image-upload';

  @Output() fileChange = new EventEmitter<File | null>();
  @Output() removeCurrent = new EventEmitter<void>();

  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  selectedFileName = signal<string | null>(null);
  selectedFileSize = signal<string | null>(null);
  isDragging = signal<boolean>(false);
  validationError = signal<string | null>(null);
  isRemoved = signal<boolean>(false);

  private readonly maxSizeBytes = 5 * 1024 * 1024; // 5 MB
  private readonly allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentImageUrl'] && this.currentImageUrl) {
      this.isRemoved.set(false);
      this.selectedFile.set(null);
      this.previewUrl.set(null);
      this.selectedFileName.set(null);
      this.selectedFileSize.set(null);
      this.validationError.set(null);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  removeImage(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.selectedFileName.set(null);
    this.selectedFileSize.set(null);
    this.validationError.set(null);
    this.isRemoved.set(true);

    this.fileChange.emit(null);
    this.removeCurrent.emit();
  }

  private processFile(file: File): void {
    this.validationError.set(null);

    if (!this.allowedMimes.includes(file.type)) {
      this.validationError.set('Formato de imagen no soportado. Usa JPG, PNG o WebP.');
      return;
    }

    if (file.size > this.maxSizeBytes) {
      this.validationError.set('El tamaño de la imagen no puede superar 5 MB.');
      return;
    }

    this.isRemoved.set(false);
    this.selectedFile.set(file);
    this.selectedFileName.set(file.name);
    this.selectedFileSize.set(this.formatFileSize(file.size));

    // Lectura para preview
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);

    this.fileChange.emit(file);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
