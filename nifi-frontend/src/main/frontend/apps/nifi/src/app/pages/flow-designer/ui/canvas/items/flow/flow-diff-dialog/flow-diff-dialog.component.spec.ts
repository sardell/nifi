import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FlowDiffDialogComponent } from './flow-diff-dialog.component';

describe('FlowDiffDialogComponent', () => {
    let component: FlowDiffDialogComponent;
    let fixture: ComponentFixture<FlowDiffDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FlowDiffDialogComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(FlowDiffDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
