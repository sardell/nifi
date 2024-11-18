import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FlowDiffComponent, FlowDiffDialogResponse } from '../../../../../state/flow';
import { FlowDiffTableComponent } from './flow-diff-table/flow-diff-table.component';

@Component({
    selector: 'app-flow-diff-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, FlowDiffTableComponent],
    templateUrl: './flow-diff-dialog.component.html',
    styleUrl: './flow-diff-dialog.component.scss'
})
export class FlowDiffDialogComponent {
    componentDifferences: FlowDiffComponent[];

    constructor(@Inject(MAT_DIALOG_DATA) public data: FlowDiffDialogResponse) {
        this.componentDifferences = data.componentDifferences;
    }
}
