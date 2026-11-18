import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-donut-chart',
  templateUrl: './donut-chart.component.html',
  styleUrl: './donut-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonutChartComponent {
  @Input() percent = 0;
  @Input() label = '';
  readonly radius = 52;
  readonly circumference = 2 * Math.PI * this.radius;
  get dash(): number { return (Math.min(100, Math.max(0, this.percent)) / 100) * this.circumference; }
}
