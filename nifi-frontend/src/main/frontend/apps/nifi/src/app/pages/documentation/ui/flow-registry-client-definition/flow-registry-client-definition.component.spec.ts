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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlowRegistryClientDefinition } from './flow-registry-client-definition.component';
import { provideMockStore } from '@ngrx/store/testing';
import { documentationFeatureKey } from '../../state';
import { flowRegistryClientDefinitionFeatureKey } from '../../state/flow-registry-client-definition';
import { initialState } from '../../state/flow-registry-client-definition/flow-registry-client-definition.reducer';

describe('FlowRegistryClientDefinition', () => {
    let component: FlowRegistryClientDefinition;
    let fixture: ComponentFixture<FlowRegistryClientDefinition>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FlowRegistryClientDefinition],
            providers: [
                provideMockStore({
                    initialState: {
                        [documentationFeatureKey]: {
                            [flowRegistryClientDefinitionFeatureKey]: initialState
                        }
                    }
                })
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(FlowRegistryClientDefinition);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
