import { Component, DestroyRef, inject, Input, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ComponentType, NiFiCommon } from '@nifi/shared';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { ComponentDifference, FlowDiffComponent } from 'apps/nifi/src/app/pages/flow-designer/state/flow';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';

interface LocalChange {
    componentType: ComponentType;
    componentId: string;
    componentName: string;
    // processGroupId: string;
    differenceType: string;
    difference: string;
}

@Component({
    selector: 'flow-diff-table',
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatSortModule,
        MatFormField,
        MatLabel,
        ReactiveFormsModule,
        MatInputModule,
        MatMenuTrigger,
        MatMenuModule,
        MatPaginatorModule
    ],
    templateUrl: './flow-diff-table.component.html',
    styleUrl: './flow-diff-table.component.scss'
})
export class FlowDiffTableComponent implements AfterViewInit {
    filterForm: FormGroup;
    private destroyRef: DestroyRef = inject(DestroyRef);
    initialSortColumn: 'componentName' | 'changeType' | 'difference' = 'componentName';
    initialSortDirection: 'asc' | 'desc' = 'asc';

    filterTerm = '';
    totalCount = 0;
    filteredCount = 0;
    pageSize = 50;

    activeSort: Sort = {
        active: this.initialSortColumn,
        direction: this.initialSortDirection
    };

    displayedColumns: string[] = ['componentName', 'changeType', 'difference', 'actions'];
    dataSource: MatTableDataSource<LocalChange> = new MatTableDataSource<LocalChange>();

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    @Input() set differences(differences: FlowDiffComponent[]) {
        const localChanges: LocalChange[] = this.explodeDifferences(differences);
        this.dataSource.data = this.sortEntities(localChanges, this.activeSort);
        this.dataSource.filterPredicate = (data: LocalChange, filter: string) => {
            const { filterTerm } = JSON.parse(filter);
            // check the filter term in both the name and type columns
            return (
                this.nifiCommon.stringContains(data.componentName, filterTerm, true) ||
                this.nifiCommon.stringContains(data.differenceType, filterTerm, true)
            );
        };
        this.totalCount = localChanges.length;
        this.filteredCount = localChanges.length;

        // apply any filtering to the new data
        const filterTerm = this.filterForm.get('filterTerm')?.value;
        if (filterTerm?.length > 0) {
            this.applyFilter(filterTerm);
        }
    }

    // @Output() goToChange: EventEmitter<NavigateToComponentRequest> = new EventEmitter<NavigateToComponentRequest>();

    constructor(
        private formBuilder: FormBuilder,
        private nifiCommon: NiFiCommon
    ) {
        this.filterForm = this.formBuilder.group({ filterTerm: '', filterColumn: 'componentName' });
    }

    ngAfterViewInit(): void {
        this.filterForm
            .get('filterTerm')
            ?.valueChanges.pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
            .subscribe((filterTerm: string) => {
                this.applyFilter(filterTerm);
            });
        this.dataSource.paginator = this.paginator;
    }

    applyFilter(filterTerm: string) {
        this.dataSource.filter = JSON.stringify({ filterTerm });
        this.filteredCount = this.dataSource.filteredData.length;
    }

    formatComponentName(item: LocalChange): string {
        return item.componentName || '';
    }

    formatChangeType(item: LocalChange): string {
        return item.differenceType;
    }

    formatDifference(item: LocalChange): string {
        return item.difference;
    }

    sortData(sort: Sort) {
        this.activeSort = sort;
        this.dataSource.data = this.sortEntities(this.dataSource.data, sort);
    }

    sortEntities(data: LocalChange[], sort: Sort): LocalChange[] {
        if (!data) {
            return [];
        }
        return data.slice().sort((a, b) => {
            const isAsc = sort.direction === 'asc';
            let retVal = 0;
            switch (sort.active) {
                case 'componentName':
                    retVal = this.nifiCommon.compareString(this.formatComponentName(a), this.formatComponentName(b));
                    break;
                case 'changeType':
                    retVal = this.nifiCommon.compareString(this.formatChangeType(a), this.formatChangeType(b));
                    break;
                case 'difference':
                    retVal = this.nifiCommon.compareString(this.formatDifference(a), this.formatDifference(b));
                    break;
                default:
                    return 0;
            }
            return retVal * (isAsc ? 1 : -1);
        });
    }

    goToClicked(item: LocalChange) {
        console.log('item: ', item);
        // const linkMeta: NavigateToComponentRequest = {
        //     id: item.componentId,
        //     type: item.componentType,
        //     processGroupId: item.processGroupId
        // };
        // this.goToChange.next(linkMeta);
    }

    paginationChanged(pageEvent: PageEvent): void {
        // Initiate the call to the backend for the requested page of data
        // this.store.dispatch(
        //     HistoryActions.loadHistory({
        //         request: {
        //             ...this.queryRequest,
        //             count: this.pageSize,
        //             offset: pageEvent.pageIndex * this.pageSize
        //         }
        //     })
        // );

        // clear out any selection
        // this.store.dispatch(HistoryActions.clearHistorySelection());
    }

    getPageIndex(): unknown {
        return 0;
    }

    private explodeDifferences(differences: FlowDiffComponent[]): LocalChange[] {
        return differences.reduce((accumulator, currentValue) => {
            const diffs = currentValue.differences.map(
                (diff) =>
                    ({
                        componentName: currentValue.componentName,
                        componentId: currentValue.componentId,
                        componentType: currentValue.componentType,
                        differenceType: diff.differenceType,
                        difference: diff.difference
                    }) as LocalChange
            );
            return [...accumulator, ...diffs];
        }, [] as LocalChange[]);
    }
}
