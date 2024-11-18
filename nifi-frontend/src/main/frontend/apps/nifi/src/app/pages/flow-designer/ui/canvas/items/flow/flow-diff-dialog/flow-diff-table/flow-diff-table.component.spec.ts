import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FlowDiffTableComponent } from './flow-diff-table.component';

describe('FlowDiffTableComponent', () => {
    let component: FlowDiffTableComponent;
    let fixture: ComponentFixture<FlowDiffTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FlowDiffTableComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(FlowDiffTableComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
