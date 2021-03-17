/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.apache.nifi.cluster.manager;

import org.apache.nifi.cluster.protocol.NodeIdentifier;
import org.apache.nifi.util.EqualsWrapper;
import org.apache.nifi.web.api.dto.FlowAnalysisRuleDTO;
import org.apache.nifi.web.api.dto.FlowAnalysisRuleViolationDTO;
import org.apache.nifi.web.api.dto.PermissionsDTO;
import org.apache.nifi.web.api.entity.FlowAnalysisResultEntity;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class FlowAnalysisResultEntityMergerTest {
    public static final NodeIdentifier NODE_ID_1 = nodeIdOf("id1");
    public static final NodeIdentifier NODE_ID_2 = nodeIdOf("id2");

    private FlowAnalysisResultEntityMerger testSubject;

    @BeforeEach
    void setUp() {
        testSubject = new FlowAnalysisResultEntityMerger();
    }

    @Test
    void differentViolationsAreMerged() {
        // GIVEN
        FlowAnalysisResultEntity clientEntity = resultEntityOf(
                setOf(ruleOf("ruleId")),
                setOf(ruleViolationOf("ruleId", true, true))
        );

        Map<NodeIdentifier, FlowAnalysisResultEntity> entityMap = resultEntityMapOf(
                resultEntityOf(
                        setOf(ruleOf("ruleId1")),
                        setOf(ruleViolationOf("ruleId1", true, true))
                ),
                resultEntityOf(
                        setOf(ruleOf("ruleId2")),
                        setOf(ruleViolationOf("ruleId2", true, true))
                )
        );

        FlowAnalysisResultEntity expectedClientEntity = resultEntityOf(
                setOf(ruleOf("ruleId"), ruleOf("ruleId1"), ruleOf("ruleId2")),
                setOf(
                        ruleViolationOf("ruleId", true, true),
                        ruleViolationOf("ruleId1", true, true),
                        ruleViolationOf("ruleId2", true, true)
                )
        );

        testMerge(clientEntity, entityMap, expectedClientEntity);
    }

    @Test
    void violationThatCannotBeReadOnAnyNodeIsOmitted() {
        // GIVEN
        String ruleId = "ruleWithViolationThatCantBeReadOnOneNode";

        FlowAnalysisResultEntity clientEntity = resultEntityOf(
                setOf(ruleOf(ruleId)),
                setOf(ruleViolationOf(ruleId, true, true))
        );

        Map<NodeIdentifier, FlowAnalysisResultEntity> entityMap = resultEntityMapOf(
                resultEntityOf(
                        setOf(ruleOf(ruleId)),
                        setOf(ruleViolationOf(ruleId, false, true))
                ),
                resultEntityOf(
                        setOf(ruleOf(ruleId)),
                        setOf(ruleViolationOf(ruleId, true, true))
                )
        );

        FlowAnalysisResultEntity expectedClientEntity = resultEntityOf(
                setOf(ruleOf(ruleId)),
                setOf()
        );

        testMerge(clientEntity, entityMap, expectedClientEntity);
    }

    @Test
    void evenWhenViolationIsOmittedTheRuleIsNot() {
        // GIVEN
        FlowAnalysisResultEntity clientEntity = resultEntityOf(
                setOf(),
                setOf()
        );

        Map<NodeIdentifier, FlowAnalysisResultEntity> entityMap = resultEntityMapOf(
                resultEntityOf(
                        setOf(ruleOf("notOmittedRuleButOmittedViolation")),
                        setOf(ruleViolationOf("notOmittedRuleButOmittedViolation", false, true))
                ),
                resultEntityOf(
                        setOf(),
                        setOf()
                )
        );

        FlowAnalysisResultEntity expectedClientEntity = resultEntityOf(
                setOf(ruleOf("notOmittedRuleButOmittedViolation")),
                setOf()
        );

        testMerge(clientEntity, entityMap, expectedClientEntity);
    }

    @Test
    void violationThatCannotBeWrittenIsNotOmitted() {
        // GIVEN
        String ruleId = "ruleWithViolationThatCantBeWrittenOnOneNode";

        FlowAnalysisResultEntity clientEntity = resultEntityOf(
                setOf(ruleOf(ruleId)),
                setOf(ruleViolationOf(ruleId, true, false))
        );

        Map<NodeIdentifier, FlowAnalysisResultEntity> entityMap = resultEntityMapOf(
                resultEntityOf(
                        setOf(ruleOf(ruleId)),
                        setOf(ruleViolationOf(ruleId, true, false))
                ),
                resultEntityOf(
                        setOf(ruleOf(ruleId)),
                        setOf(ruleViolationOf(ruleId, true, false))
                )
        );

        FlowAnalysisResultEntity expectedClientEntity = clientEntity;

        testMerge(clientEntity, entityMap, expectedClientEntity);
    }

    private void testMerge(FlowAnalysisResultEntity clientEntity, Map<NodeIdentifier, FlowAnalysisResultEntity> entityMap, FlowAnalysisResultEntity expectedClientEntity) {
        // GIVEN
        List<Function<FlowAnalysisRuleDTO, Object>> rulePropertiesProviders = Arrays.asList(FlowAnalysisRuleDTO::getId);
        List<Function<FlowAnalysisRuleViolationDTO, Object>> list = Arrays.asList(
                FlowAnalysisRuleViolationDTO::getRuleId,
                FlowAnalysisRuleViolationDTO::isEnabled,
                ruleViolation -> ruleViolation.getSubjectPermissionDto().getCanRead(),
                ruleViolation -> ruleViolation.getSubjectPermissionDto().getCanWrite()
        );
        List<Function<FlowAnalysisResultEntity, Object>> resultEntityEqualsPropertiesProviders = Arrays.asList(
                resultEntity -> new HashSet<>(EqualsWrapper.wrapList(resultEntity.getRules(), rulePropertiesProviders)),
                resultEntity -> new HashSet<>(EqualsWrapper.wrapList(resultEntity.getRuleViolations(), list))
        );

        // WHEN
        testSubject.merge(clientEntity, entityMap);

        // THEN
        assertEquals(new EqualsWrapper<>(
                expectedClientEntity,
                resultEntityEqualsPropertiesProviders
        ), new EqualsWrapper<>(
                clientEntity,
                resultEntityEqualsPropertiesProviders
        ));
    }

    @NotNull
    private static NodeIdentifier nodeIdOf(String nodeId) {
        NodeIdentifier nodeIdentifier = new NodeIdentifier(nodeId, "unimportant", 1, "unimportant", 1, "unimportant", 1, 1, false);
        return nodeIdentifier;
    }

    @NotNull
    private static FlowAnalysisRuleDTO ruleOf(String ruleId) {
        FlowAnalysisRuleDTO rule = new FlowAnalysisRuleDTO();

        rule.setId(ruleId);

        return rule;
    }

    @NotNull
    private static FlowAnalysisRuleViolationDTO ruleViolationOf(
            String ruleId,
            boolean canRead,
            boolean canWrite
    ) {
        FlowAnalysisRuleViolationDTO ruleViolation = new FlowAnalysisRuleViolationDTO();

        ruleViolation.setRuleId(ruleId);
        ruleViolation.setSubjectPermissionDto(permissionOf(canRead, canWrite));

        return ruleViolation;
    }

    @NotNull
    private static PermissionsDTO permissionOf(boolean canRead, boolean canWrite) {
        PermissionsDTO subjectPermissionDto = new PermissionsDTO();

        subjectPermissionDto.setCanRead(canRead);
        subjectPermissionDto.setCanWrite(canWrite);

        return subjectPermissionDto;
    }

    @NotNull
    private static FlowAnalysisResultEntity resultEntityOf(Set<FlowAnalysisRuleDTO> rules, Set<FlowAnalysisRuleViolationDTO> ruleViolations) {
        FlowAnalysisResultEntity clientEntity = new FlowAnalysisResultEntity();

        clientEntity.setRules(rules);
        clientEntity.setRuleViolations(ruleViolations);

        return clientEntity;
    }

    @NotNull
    private static Map<NodeIdentifier, FlowAnalysisResultEntity> resultEntityMapOf(FlowAnalysisResultEntity clientEntity1, FlowAnalysisResultEntity clientEntity2) {
        Map<NodeIdentifier, FlowAnalysisResultEntity> entityMap = new HashMap<>();

        entityMap.put(NODE_ID_1, clientEntity1);
        entityMap.put(NODE_ID_2, clientEntity2);

        return entityMap;
    }

    @NotNull
    private static <T> Set<T> setOf(T... items) {
        Set<T> itemSet = new HashSet<>();
        for (T item : items) {
            itemSet.add(item);

        }
        return itemSet;
    }
}
