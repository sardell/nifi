/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatCell, MatCellDef, MatColumnDef, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSortModule, Sort } from '@angular/material/sort';
import {
    BranchEntity,
    BucketEntity,
    RegistryClientEntity,
    VersionedFlow,
    VersionedFlowEntity,
    VersionedFlowSnapshotMetadata,
    VersionedFlowSnapshotMetadataEntity
} from '../../../../../../../state/shared';
import { ChangeVersionDialogRequest, VersionControlInformation } from '../../../../../state/flow';
import { Store } from '@ngrx/store';
import { CanvasState } from '../../../../../state';
import { selectTimeOffset } from '../../../../../../../state/flow-configuration/flow-configuration.selectors';
import { NiFiCommon, CloseOnEscapeDialog, NifiTooltipDirective, SelectOption, TextTip } from '@nifi/shared';
import { MatMenuModule } from '@angular/material/menu';
import { openFlowDiffDialogRequest } from '../../../../../state/flow/flow.actions';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Observable, of, take } from 'rxjs';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ErrorBanner } from '../../../../../../../ui/common/error-banner/error-banner.component';
import { MatOptionModule } from '@angular/material/core';

@Component({
    selector: 'change-version-dialog',
    standalone: true,
    imports: [
        AsyncPipe,
        MatCell,
        MatCellDef,
        MatColumnDef,
        MatDialogModule,
        MatSortModule,
        MatTableModule,
        MatMenuModule,
        ErrorBanner,
        MatButtonModule,
        MatFormFieldModule,
        NgIf,
        ReactiveFormsModule,
        MatOptionModule,
        MatSelectModule,
        NgForOf,
        NifiTooltipDirective,
        MatCheckboxModule
    ],
    templateUrl: './change-version-dialog.html',
    styleUrl: './change-version-dialog.scss'
})
export class ChangeVersionDialog extends CloseOnEscapeDialog implements OnInit {
    @Input() getBranches: (registryId: string) => Observable<BranchEntity[]> = () => of([]);
    @Input() getBuckets!: (registryId: string, branch?: string) => Observable<BucketEntity[]>;
    @Input() getFlows!: (registryId: string, bucketId: string, branch?: string) => Observable<VersionedFlowEntity[]>;
    @Input() getFlowVersions!: (
        registryId: string,
        bucketId: string,
        flowId: string,
        branch?: string
    ) => Observable<VersionedFlowSnapshotMetadataEntity[]>;
    displayedColumns: string[] = ['version', 'created', 'comments', 'actions'];
    dataSource: MatTableDataSource<VersionedFlowSnapshotMetadata> =
        new MatTableDataSource<VersionedFlowSnapshotMetadata>();
    selectedFlowVersion: VersionedFlowSnapshotMetadata | null = null;
    sort: Sort = {
        active: 'created',
        direction: 'desc'
    };
    versionControlInformation: VersionControlInformation;
    supportsBranching = false;
    registryClientOptions: SelectOption[] = [];
    changeVersionForm: FormGroup;
    branchOptions: SelectOption[] = [];
    bucketOptions: SelectOption[] = [];
    flowOptions: SelectOption[] = [];

    selectedFlowDescription: string | undefined;
    flowLookup: Map<string, VersionedFlow> = new Map<string, VersionedFlow>();

    private clientBranchingSupportMap: Map<string, boolean> = new Map<string, boolean>();
    private timeOffset = this.store.selectSignal(selectTimeOffset);
    protected readonly TextTip = TextTip;

    @Output() changeVersion: EventEmitter<VersionedFlowSnapshotMetadata> =
        new EventEmitter<VersionedFlowSnapshotMetadata>();

    constructor(
        @Inject(MAT_DIALOG_DATA) private dialogRequest: ChangeVersionDialogRequest,
        private formBuilder: FormBuilder,
        private nifiCommon: NiFiCommon,
        private store: Store<CanvasState>
    ) {
        super();
        const flowVersions = dialogRequest.versions.map((entity) => entity.versionedFlowSnapshotMetadata);
        const sortedFlowVersions = this.sortVersions(flowVersions, this.sort);
        this.selectedFlowVersion = sortedFlowVersions[0];
        this.dataSource.data = sortedFlowVersions;
        this.versionControlInformation = dialogRequest.versionControlInformation;

        const sortedRegistries = dialogRequest.registryClients.slice().sort((a, b) => {
            return this.nifiCommon.compareString(a.component.name, b.component.name);
        });

        sortedRegistries.forEach((registryClient: RegistryClientEntity) => {
            if (registryClient.permissions.canRead) {
                this.registryClientOptions.push({
                    text: registryClient.component.name,
                    value: registryClient.id,
                    description: registryClient.component.description
                });
            }
            this.clientBranchingSupportMap.set(registryClient.id, registryClient.component.supportsBranching);
        });
        this.changeVersionForm = this.formBuilder.group({
            branch: new FormControl('main', Validators.required),
            bucket: new FormControl(null, Validators.required),
            flow: new FormControl(null, Validators.required)
        });
    }

    ngOnInit(): void {
        const selectedRegistryId = this.versionControlInformation.registryId;

        if (selectedRegistryId) {
            this.supportsBranching = this.clientBranchingSupportMap.get(selectedRegistryId) || false;
            if (this.supportsBranching) {
                this.loadBranches(selectedRegistryId);
            } else {
                this.loadBuckets(selectedRegistryId);
            }
        }
    }

    sortData(sort: Sort) {
        this.sort = sort;
        this.dataSource.data = this.sortVersions(this.dataSource.data, sort);
    }

    sortVersions(data: VersionedFlowSnapshotMetadata[], sort: Sort): VersionedFlowSnapshotMetadata[] {
        if (!data) {
            return [];
        }
        return data.slice().sort((a, b) => {
            const isAsc = sort.direction === 'asc';
            let retVal = 0;
            switch (sort.active) {
                case 'version':
                    retVal = this.compareVersion(a.version, b.version);
                    break;
                case 'created':
                    retVal = this.nifiCommon.compareNumber(a.timestamp, b.timestamp);
                    break;
                case 'comments':
                    retVal = this.nifiCommon.compareString(a.comments, b.comments);
                    break;
            }
            return retVal * (isAsc ? 1 : -1);
        });
    }

    private compareVersion(a: string, b: string): number {
        if (this.nifiCommon.isNumber(a) && this.nifiCommon.isNumber(b)) {
            return this.nifiCommon.compareNumber(parseInt(a, 10), parseInt(b, 10));
        } else {
            return this.nifiCommon.compareString(a, b);
        }
    }

    select(flowVersion: VersionedFlowSnapshotMetadata): void {
        this.selectedFlowVersion = flowVersion;
    }

    isSelected(flowVersion: VersionedFlowSnapshotMetadata): boolean {
        if (this.selectedFlowVersion) {
            return flowVersion.version === this.selectedFlowVersion.version;
        }
        return false;
    }

    private getTimezoneOffset(): number {
        return this.timeOffset() || 0;
    }

    formatTimestamp(flowVersion: VersionedFlowSnapshotMetadata) {
        // get the current user time to properly convert the server time
        const now: Date = new Date();

        // convert the user offset to millis
        const userTimeOffset: number = now.getTimezoneOffset() * 60 * 1000;

        // create the proper date by adjusting by the offsets
        const date: Date = new Date(flowVersion.timestamp + userTimeOffset + this.getTimezoneOffset());
        return this.nifiCommon.formatDateTime(date);
    }

    changeFlowVersion() {
        if (this.selectedFlowVersion != null) {
            this.changeVersion.next(this.selectedFlowVersion);
        }
    }

    isSelectionValid() {
        if (!this.selectedFlowVersion) {
            return false;
        }
        return this.selectedFlowVersion.version !== this.versionControlInformation.version;
    }

    viewFlowDiff(item: VersionedFlowSnapshotMetadata) {
        // get version data in common format
        const selectedVersion = this.dataSource.data.find((d) => d.version === item.version)!;
        // pass current version registry ID
        this.store.dispatch(
            openFlowDiffDialogRequest({
                request: {
                    currentVersion: this.versionControlInformation,
                    selectedVersion: selectedVersion
                }
            })
        );
    }

    branchChanged(branch: string): void {
        this.clearBuckets();
        const registryId = this.versionControlInformation.registryId;
        this.loadBuckets(registryId, branch);
    }

    private clearBuckets(): void {
        this.bucketOptions = [];
        this.changeVersionForm.get('bucket')?.setValue(null);
        this.clearFlows();
    }

    bucketChanged(bucketId: string): void {
        this.clearFlows();
        const registryId = this.versionControlInformation.registryId;
        const branch = this.changeVersionForm.get('branch')?.value;
        this.loadFlows(registryId, bucketId, branch);
    }

    private clearFlows() {
        this.changeVersionForm.get('flow')?.setValue(null);
        this.flowOptions = [];
        this.dataSource.data = [];
    }

    flowChanged(flowId: string): void {
        const registryId = this.versionControlInformation.registryId;
        const bucketId = this.changeVersionForm.get('bucket')?.value;
        const branch = this.changeVersionForm.get('branch')?.value;
        this.loadVersions(registryId, bucketId, flowId, branch);
    }

    loadBranches(registryId: string): void {
        if (registryId) {
            this.branchOptions = [];

            this.getBranches(registryId)
                .pipe(take(1))
                .subscribe((branches: BranchEntity[]) => {
                    if (branches.length > 0) {
                        branches.forEach((entity: BranchEntity) => {
                            this.branchOptions.push({
                                text: entity.branch.name,
                                value: entity.branch.name
                            });
                        });

                        const branchId = this.branchOptions[0].value;
                        if (branchId) {
                            this.changeVersionForm.get('branch')?.setValue(branchId);
                            this.loadBuckets(registryId, branchId);
                        }
                    }
                });
        }
    }

    loadBuckets(registryId: string, branch?: string): void {
        this.bucketOptions = [];

        this.getBuckets(registryId, branch)
            .pipe(take(1))
            .subscribe((buckets: BucketEntity[]) => {
                if (buckets.length > 0) {
                    buckets.forEach((entity: BucketEntity) => {
                        if (entity.permissions.canRead) {
                            this.bucketOptions.push({
                                text: entity.bucket.name,
                                value: entity.id,
                                description: entity.bucket.description
                            });
                        }
                    });

                    const bucketId = this.bucketOptions[0].value;
                    if (bucketId) {
                        this.changeVersionForm.get('bucket')?.setValue(bucketId);
                        this.loadFlows(registryId, bucketId, branch);
                    }
                }
            });
    }

    loadFlows(registryId: string, bucketId: string, branch?: string): void {
        this.flowOptions = [];
        this.flowLookup.clear();

        this.getFlows(registryId, bucketId, branch)
            .pipe(take(1))
            .subscribe((versionedFlows: VersionedFlowEntity[]) => {
                if (versionedFlows.length > 0) {
                    versionedFlows.forEach((entity: VersionedFlowEntity) => {
                        this.flowLookup.set(entity.versionedFlow.flowId!, entity.versionedFlow);

                        this.flowOptions.push({
                            text: entity.versionedFlow.flowName,
                            value: entity.versionedFlow.flowId!,
                            description: entity.versionedFlow.description
                        });
                    });

                    const flowId = this.flowOptions[0].value;
                    if (flowId) {
                        this.changeVersionForm.get('flow')?.setValue(flowId);
                        this.loadVersions(registryId, bucketId, flowId, branch);
                    }
                }
            });
    }

    loadVersions(registryId: string, bucketId: string, flowId: string, branch?: string): void {
        this.dataSource.data = [];
        this.selectedFlowDescription = this.flowLookup.get(flowId)?.description;

        this.getFlowVersions(registryId, bucketId, flowId, branch)
            .pipe(take(1))
            .subscribe((metadataEntities: VersionedFlowSnapshotMetadataEntity[]) => {
                if (metadataEntities.length > 0) {
                    const flowVersions = metadataEntities.map(
                        (entity: VersionedFlowSnapshotMetadataEntity) => entity.versionedFlowSnapshotMetadata
                    );

                    const sortedFlowVersions = this.sortVersions(flowVersions, this.sort);
                    this.selectedFlowVersion = sortedFlowVersions[0];

                    this.dataSource.data = sortedFlowVersions;
                }
            });
    }
}
