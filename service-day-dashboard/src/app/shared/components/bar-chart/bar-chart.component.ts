import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface BarDatum { label: string; value: number; total: number; }

@Component({
  standalone: false,
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarChartComponent {
  @Input() data: BarDatum[] = [];
  get max(): number { return Math.max(1, ...this.data.map(d => d.total)); }
  height(d: BarDatum): number { return (d.total / this.max) * 100; }
  fill(d: BarDatum): number { return d.total ? (d.value / d.total) * 100 : 0; }
}
