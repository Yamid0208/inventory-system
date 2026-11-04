import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { AppImageUploadComponent } from './app-image-upload.component';

describe('AppImageUploadComponent', () => {
  it('inicializa con valores nulos y estado sin archivo', () => {
    const comp = new AppImageUploadComponent();
    expect(comp.selectedFile()).toBeNull();
    expect(comp.previewUrl()).toBeNull();
    expect(comp.validationError()).toBeNull();
    expect(comp.isDragging()).toBe(false);
  });

  it('rechaza archivos que no sean imágenes JPG, PNG o WebP', () => {
    const comp = new AppImageUploadComponent();
    const badFile = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });

    (comp as any).processFile(badFile);

    expect(comp.validationError()).toContain('Formato de imagen no soportado');
    expect(comp.selectedFile()).toBeNull();
  });

  it('rechaza archivos mayores a 5 MB', () => {
    const comp = new AppImageUploadComponent();
    const largeFile = new File(['a'.repeat(100)], 'huge.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

    (comp as any).processFile(largeFile);

    expect(comp.validationError()).toContain('no puede superar 5 MB');
    expect(comp.selectedFile()).toBeNull();
  });

  it('emite evento de remoción al llamar removeImage()', () => {
    const comp = new AppImageUploadComponent();
    const removeSpy = vi.spyOn(comp.removeCurrent, 'emit');
    const fileChangeSpy = vi.spyOn(comp.fileChange, 'emit');

    comp.removeImage();

    expect(comp.isRemoved()).toBe(true);
    expect(comp.selectedFile()).toBeNull();
    expect(removeSpy).toHaveBeenCalled();
    expect(fileChangeSpy).toHaveBeenCalledWith(null);
  });
});
