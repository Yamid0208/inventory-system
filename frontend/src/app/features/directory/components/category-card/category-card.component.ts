import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '../../../../core/models/category.model';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-card.component.html'
})
export class CategoryCardComponent {
  @Input({ required: true }) category!: Category;
  @Output() edit = new EventEmitter<Category>();
  @Output() delete = new EventEmitter<Category>();
  @Output() statusToggle = new EventEmitter<{ category: Category; isActive: boolean }>();

  getIconColorClass(): string {
    const name = this.category.name.toLowerCase();
    if (name.includes('electr') || name.includes('comput') || name.includes('hardw')) {
      return 'bg-blue-50 text-blue-600 border border-blue-100';
    }
    if (name.includes('mobil') || name.includes('muebl') || name.includes('oficina')) {
      return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    }
    if (name.includes('embal') || name.includes('envi') || name.includes('pack')) {
      return 'bg-purple-50 text-purple-600 border border-purple-100';
    }
    return 'bg-amber-50 text-amber-600 border border-amber-100';
  }

  onToggle(event: Event): void {
    event.stopPropagation();
    this.statusToggle.emit({
      category: this.category,
      isActive: !this.category.isActive
    });
  }
}
