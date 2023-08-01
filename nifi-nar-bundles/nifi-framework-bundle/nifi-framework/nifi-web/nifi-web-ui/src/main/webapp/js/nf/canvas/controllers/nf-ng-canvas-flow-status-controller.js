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

/* global define, module, require, exports */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery',
                'nf.Common',
                'nf.Dialog',
                'nf.CanvasUtils',
                'nf.ContextMenu',
                'nf.ClusterSummary',
                'nf.ErrorHandler',
                'nf.Settings',
                'nf.ParameterContexts',
                'nf.ProcessGroup',
                'nf.ProcessGroupConfiguration',
                'nf.Shell'],
            function ($, nfCommon, nfDialog, nfCanvasUtils, nfContextMenu, nfClusterSummary, nfErrorHandler, nfSettings, nfParameterContexts, nfProcessGroup, nfProcessGroupConfiguration, nfShell) {
                return (nf.ng.Canvas.FlowStatusCtrl = factory($, nfCommon, nfDialog, nfCanvasUtils, nfContextMenu, nfClusterSummary, nfErrorHandler, nfSettings, nfParameterContexts, nfProcessGroup, nfProcessGroupConfiguration, nfShell));
            });
    } else if (typeof exports === 'object' && typeof module === 'object') {
        module.exports = (nf.ng.Canvas.FlowStatusCtrl =
            factory(require('jquery'),
                require('nf.Common'),
                require('nf.Dialog'),
                require('nf.CanvasUtils'),
                require('nf.ContextMenu'),
                require('nf.ClusterSummary'),
                require('nf.ErrorHandler'),
                require('nf.Settings'),
                require('nf.ParameterContexts'),
                require('nf.ProcessGroup'),
                require('nf.ProcessGroupConfiguration'),
                require('nf.Shell')));
    } else {
        nf.ng.Canvas.FlowStatusCtrl = factory(root.$,
            root.nf.Common,
            root.nf.Dialog,
            root.nf.CanvasUtils,
            root.nf.ContextMenu,
            root.nf.ClusterSummary,
            root.nf.ErrorHandler,
            root.nf.Settings,
            root.nf.ParameterContexts,
            root.nf.ProcessGroup,
            root.nf.ProcessGroupConfiguration,
            root.nf.Shell);
    }
}(this, function ($, nfCommon, nfDialog, nfCanvasUtils, nfContextMenu, nfClusterSummary, nfErrorHandler, nfSettings, nfParameterContexts, nfProcessGroup, nfProcessGroupConfiguration, nfShell) {
    'use strict';

    return function (serviceProvider) {
        'use strict';

        var config = {
            search: 'Search',
            urls: {
                search: '../nifi-api/flow/search-results',
                status: '../nifi-api/flow/status',
                recsAndPolicies: '../nifi-api/controller/analyze-flow'
            }
        };

        var previousRulesResponse = {};

        function FlowStatusCtrl() {
            this.connectedNodesCount = "-";
            this.clusterConnectionWarning = false;
            this.activeThreadCount = "-";
            this.terminatedThreadCount = "-";
            this.threadCounts = "-";
            this.totalQueued = "-";
            this.controllerTransmittingCount = "-";
            this.controllerNotTransmittingCount = "-";
            this.controllerRunningCount = "-";
            this.controllerStoppedCount = "-";
            this.controllerInvalidCount = "-";
            this.controllerDisabledCount = "-";
            this.controllerUpToDateCount = "-";
            this.controllerLocallyModifiedCount = "-";
            this.controllerStaleCount = "-";
            this.controllerLocallyModifiedAndStaleCount = "-";
            this.controllerSyncFailureCount = "-";
            this.statsLastRefreshed = "-";

            /**
             * The search controller.
             */
            this.search = {

                /**
                 * Get the search input element.
                 */
                getInputElement: function () {
                    return $('#search-field');
                },

                /**
                 * Get the search button element.
                 */
                getButtonElement: function () {
                    return $('#search-button');
                },

                /**
                 * Get the search container element.
                 */
                getSearchContainerElement: function () {
                    return $('#search-container');
                },

                /**
                 * Initialize the search controller.
                 */
                init: function () {

                    var searchCtrl = this;

                    // Create new jQuery UI widget
                    $.widget('nf.searchAutocomplete', $.ui.autocomplete, {
                        reset: function () {
                            this.term = null;
                        },
                        _create: function () {
                            this._super();
                            this.widget().menu('option', 'items', '> :not(.search-header, .search-no-matches)');
                        },
                        _resizeMenu: function () {
                            var ul = this.menu.element;
                            ul.width(400);
                        },
                        _normalize: function (searchResults) {
                            var items = [];
                            items.push(searchResults);
                            return items;
                        },
                        _renderMenu: function (ul, items) {
                            var nfSearchAutocomplete = this;

                            // the object that holds the search results is normalized into a single element array
                            var searchResults = items[0];

                            // show all processors
                            if (!nfCommon.isEmpty(searchResults.processorResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon icon-processor"></div>Processors</li>');
                                $.each(searchResults.processorResults, function (i, processorMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, processorMatch, { type: 'processor' }));
                                });
                            }

                            // show all process groups
                            if (!nfCommon.isEmpty(searchResults.processGroupResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon icon-group"></div>Process Groups</li>');
                                $.each(searchResults.processGroupResults, function (i, processGroupMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, processGroupMatch, { type: 'process group' }));
                                });
                            }

                            // show all remote process groups
                            if (!nfCommon.isEmpty(searchResults.remoteProcessGroupResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon icon-group-remote"></div>Remote Process Groups</li>');
                                $.each(searchResults.remoteProcessGroupResults, function (i, remoteProcessGroupMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, remoteProcessGroupMatch, { type: 'remote process group' }));
                                });
                            }

                            // show all connections
                            if (!nfCommon.isEmpty(searchResults.connectionResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon icon-connect"></div>Connections</li>');
                                $.each(searchResults.connectionResults, function (i, connectionMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, connectionMatch, { type: 'connection' }));
                                });
                            }

                            // show all input ports
                            if (!nfCommon.isEmpty(searchResults.inputPortResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon icon-port-in"></div>Input Ports</li>');
                                $.each(searchResults.inputPortResults, function (i, inputPortMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, inputPortMatch, { type: 'input port' }));
                                });
                            }

                            // show all output ports
                            if (!nfCommon.isEmpty(searchResults.outputPortResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon icon-port-out"></div>Output Ports</li>');
                                $.each(searchResults.outputPortResults, function (i, outputPortMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, outputPortMatch, { type: 'output port' }));
                                });
                            }

                            // show all funnels
                            if (!nfCommon.isEmpty(searchResults.funnelResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon icon-funnel"></div>Funnels</li>');
                                $.each(searchResults.funnelResults, function (i, funnelMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, funnelMatch, { type: 'funnel' }));
                                });
                            }

                            // show all labels
                            if (!nfCommon.isEmpty(searchResults.labelResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon icon-label"></div>Labels</li>');
                                $.each(searchResults.labelResults, function (i, labelMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, labelMatch, { type: 'label' }));
                                });
                            }

                            // show all controller services
                            if (!nfCommon.isEmpty(searchResults.controllerServiceNodeResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon"></div>Controller Services</li>');
                                $.each(searchResults.controllerServiceNodeResults, function (i, controllerServiceMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, controllerServiceMatch, { type: 'controller service' }));
                                });
                            }

                            // show all parameter providers
                            if (!nfCommon.isEmpty(searchResults.parameterProviderNodeResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon"></div>Parameter Providers</li>');
                                $.each(searchResults.parameterProviderNodeResults, function (i, parameterProviderMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, parameterProviderMatch, { type: 'parameter provider' }));
                                });
                            }

                            // show all parameter contexts and parameters
                            if (!nfCommon.isEmpty(searchResults.parameterContextResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon"></div>Parameter Contexts</li>');
                                $.each(searchResults.parameterContextResults, function (i, parameterContextMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, parameterContextMatch, { type: 'parameter context' }));
                                });
                            }

                            // show all parameters
                            if (!nfCommon.isEmpty(searchResults.parameterResults)) {
                                ul.append('<li class="search-header"><div class="search-result-icon icon"></div>Parameters</li>');
                                $.each(searchResults.parameterResults, function (i, parameterMatch) {
                                    nfSearchAutocomplete._renderItem(ul, $.extend({}, parameterMatch, { type: 'parameter' }));
                                });
                            }

                            // ensure there were some results
                            if (ul.children().length === 0) {
                                ul.append('<li class="unset search-no-matches">No results matched the search terms</li>');
                            }
                        },
                        _renderItem: function (ul, match) {
                            var itemHeader = $('<div class="search-match-header"></div>').text(match.name);
                            var itemContent = $('<a></a>').append(itemHeader);

                            if (match.type !== 'parameter context' && match.type !== 'parameter') {
                                var parentGroupHeader = $('<div class="search-match-header"></div>').append(document.createTextNode('Parent: '));
                                var parentGroup = '-';
                                if (nfCommon.isDefinedAndNotNull(match.parentGroup)) {
                                    parentGroup = match.parentGroup.name ? match.parentGroup.name : match.parentGroup.id;
                                }
                                parentGroupHeader = parentGroupHeader.append($('<span></span>').text(parentGroup));

                                var versionedGroupHeader = $('<div class="search-match-header"></div>').append(document.createTextNode('Versioned: '));
                                var versionedGroup = '-';

                                if (nfCommon.isDefinedAndNotNull(match.versionedGroup)) {
                                    versionedGroup = match.versionedGroup.name ? match.versionedGroup.name : match.versionedGroup.id;
                                }

                                versionedGroupHeader = versionedGroupHeader.append($('<span></span>').text(versionedGroup));
                                // create a search item wrapper
                                itemContent.append(parentGroupHeader).append(versionedGroupHeader);
                            } else if (match.type === 'parameter') {
                                var paramContextHeader = $('<div class="search-match-header"></div>').append(document.createTextNode('Parameter Context: '));
                                var paramContext = '-';
                                if (nfCommon.isDefinedAndNotNull(match.parentGroup)) {
                                    paramContext = match.parentGroup.name ? match.parentGroup.name : match.parentGroup.id;
                                }
                                paramContextHeader = paramContextHeader.append($('<span></span>').text(paramContext));
                                itemContent.append(paramContextHeader);
                            }

                            // append all matches
                            $.each(match.matches, function (i, match) {
                                itemContent.append($('<div class="search-match"></div>').text(match));
                            });
                            return $('<li></li>').data('ui-autocomplete-item', match).append(itemContent).appendTo(ul);
                        }
                    });

                    // configure the new searchAutocomplete jQuery UI widget
                    this.getInputElement().searchAutocomplete({
                        delay : 1000,
                        appendTo: '#search-flow-results',
                        position: {
                            my: 'right top',
                            at: 'right bottom',
                            offset: '1 1'
                        },
                        source: function (request, response) {
                            // create the search request
                            $.ajax({
                                type: 'GET',
                                data: {
                                    q: request.term,
                                    a: nfCanvasUtils.getGroupId()
                                },
                                dataType: 'json',
                                url: config.urls.search
                            }).done(function (searchResponse) {
                                response(searchResponse.searchResultsDTO);
                            });
                        },
                        select: function (event, ui) {
                            var item = ui.item;

                            switch (item.type) {
                                case 'parameter context':
                                    nfParameterContexts.showParameterContexts(item.id);
                                    break;
                                case 'parameter':
                                    var paramContext = item.parentGroup;
                                    nfParameterContexts.showParameterContext(paramContext.id, null, item.name);
                                    break;
                                case 'controller service':
                                    var group = item.parentGroup;
                                    nfProcessGroup.enterGroup(group.id).done(function () {
                                        nfProcessGroupConfiguration.showConfiguration(group.id).done(function () {
                                            nfProcessGroupConfiguration.selectControllerService(item.id);
                                        });
                                    });
                                    break;
                                default:
                                    var group = item.parentGroup;

                                    // show the selected component
                                    nfCanvasUtils.showComponent(group.id, item.id);
                                    break;
                            }

                            searchCtrl.getInputElement().val('').blur();

                            // stop event propagation
                            return false;
                        },
                        open: function (event, ui) {
                            // show the glass pane
                            var searchField = $(this);
                            $('<div class="search-glass-pane"></div>').one('click', function () {
                            }).appendTo('body');
                        },
                        close: function (event, ui) {
                            // set the input text to '' and reset the cached term
                            $(this).searchAutocomplete('reset');
                            searchCtrl.getInputElement().val('');

                            // remove the glass pane
                            $('div.search-glass-pane').remove();
                        }
                    });

                    // hide the search input
                    searchCtrl.toggleSearchField();
                },

                /**
                 * Toggle/Slide the search field open/closed.
                 */
                toggleSearchField: function () {
                    var searchCtrl = this;

                    // hide the context menu if necessary
                    nfContextMenu.hide();

                    var isVisible = searchCtrl.getInputElement().is(':visible');
                    var display = 'none';
                    var class1 = 'search-container-opened';
                    var class2 = 'search-container-closed';
                    if (!isVisible) {
                        searchCtrl.getButtonElement().css('background-color', '#FFFFFF');
                        display = 'inline-block';
                        class1 = 'search-container-closed';
                        class2 = 'search-container-opened';
                    } else {
                        searchCtrl.getInputElement().css('display', display);
                    }

                    this.getSearchContainerElement().switchClass(class1, class2, 500, function () {
                        searchCtrl.getInputElement().css('display', display);
                        if (!isVisible) {
                            searchCtrl.getButtonElement().css('background-color', '#FFFFFF');
                            searchCtrl.getInputElement().focus();
                        } else {
                            searchCtrl.getButtonElement().css('background-color', '#E3E8EB');
                        }
                    });
                }
            }

            /**
             * The recs and policies controller.
             */

            this.recsAndPolicies = {
                /**
                 * Get the drawer trigger button element.
                 */
                getDrawerButton: function () {
                    return $('#recs-and-policies');
                },

                /**
                 * Get the drawer container
                 */
                getDrawerContainer: function () {
                    return $('#recs-and-policies-drawer');
                },

                getAccordion: function() {
                    return $('#recs-and-policies-rules-accordion');
                },

                buildRuleViolationsList: function(rules, violations) {
                    var ruleViolationCountEl = $('#rule-violation-count');
                    var ruleViolationListEl = $('#rule-violations-list');
                    ruleViolationCountEl.empty().append('(' + violations.length + ')');
                    ruleViolationListEl.empty();
                    violations.forEach(function(violation) {
                        if (violation.enforcementPolicy === 'ENFORCE') {
                            var rule = rules.find(function(rule) {
                                return rule.id === violation.ruleId;
                            });
                            var violationRule = '<div class="rule-violations-list-item-name">' + rule.name + '</div>';
                            var violationListItemEl = '<li></li>';
                            // <li class="violation-list-item"><div class="violation-list-item-wrapper"><div class="violation-list-item-name">' + violation.subjectDisplayName + '</div><span>' + violation.subjectId + '</span></div></li>'
                            var violationEl = '<div class="violation-list-item"><div class="violation-list-item-wrapper"><div class="violation-list-item-name">' + violation.subjectDisplayName + '</div><span class="violation-list-item-id">' + violation.subjectId + '</span>' +'</div></div>';
                            var violationInfoButton = $('<button class="violation-menu-btn"><i class="fa fa-ellipsis-v rules-list-item-menu-target" aria-hidden="true"></i></button>');
                            $(violationInfoButton).data('violationInfo', violation);
                            ruleViolationListEl.append($(violationListItemEl).append(violationRule).append($(violationEl).append(violationInfoButton)));
                        }
                    });
                },

                buildRuleViolations: function(rules, violations, force = false) {
                    if (Object.keys(previousRulesResponse).length !== 0) {
                        var previousRulesResponseSorted = _.sortBy(previousRulesResponse.ruleViolations, 'subjectId');
                        var violationsSorted = _.sortBy(violations, 'subjectId');
                        if (!_.isEqual(previousRulesResponseSorted, violationsSorted) || force) {
                            this.buildRuleViolationsList(rules, violations);
                        }
                    } else {
                        this.buildRuleViolationsList(rules, violations);
                    }
                },

                buildRuleList: function(ruleType, violationsMap, rec) {
                    var requiredRulesListEl = $('#required-rules-list');
                    var recommendedRulesListEl = $('#recommended-rules-list');
                    var rule = $('<li class="rules-list-item"></li>').append($(rec.requirement).append(rec.requirementInfoButton))
                    var violationsList = '';
                    var violationCountEl = '';
                    
                    var violations = violationsMap.get(rec.id);
                    if (!!violations) {
                        if (violations.length === 1) {
                            violationCountEl = '<div class="rule-' + ruleType + 's-count">' + violations.length + ' ' + ruleType + '</div>';
                        } else {
                            violationCountEl = '<div class="rule-' + ruleType + 's-count">' + violations.length + ' ' + ruleType + 's</div>';
                        }
                        violationsList = $('<ul class="rule-' + ruleType + 's-list"></ul>');
                        violations.forEach(function(violation) {
                            var violationListItem = $('<li class="' + ruleType + '-list-item"><div class="' + ruleType + '-list-item-wrapper"><div class="' + ruleType + '-list-item-name">' + violation.subjectDisplayName + '</div><span class="' + ruleType + '-list-item-id">' + violation.subjectId + '</span></div></li>');
                            var violationInfoButton = $('<button class="violation-menu-btn"><i class="fa fa-ellipsis-v rules-list-item-menu-target" aria-hidden="true"></i></button>');
                            $(violationInfoButton).data('violationInfo', violation);
                            $(violationsList).append(violationListItem.append(violationInfoButton));
                        });
                        rule.append(violationCountEl).append(violationsList);
                    }
                    ruleType === 'violation' ? requiredRulesListEl.append(rule) : recommendedRulesListEl.append(rule);
                },

                loadFlowPolicies: function () {
                    var recsAndPoliciesCtrl = this;
                    var res;
                    var requiredRulesListEl = $('#required-rules-list');
                    var recommendedRulesListEl = $('#recommended-rules-list');
                    var requiredRuleCountEl = $('#required-rule-count');
                    var recommendedRuleCountEl = $('#recommended-rule-count');

                    var groupId = nfCanvasUtils.getGroupId();
                    if (groupId !== 'root') {
                        $.ajax({
                            type: 'GET',
                            url: '../nifi-api/flow/flow-analysis/result/' + groupId,
                            dataType: 'json',
                            context: this
                        }).done(function (response) {
                            res = response;
                            var recommendations = [];
                            var requirements = [];
                            var requirementsTotal = 0;
                            var recommendationsTotal = 0;

                            if (!_.isEqual(previousRulesResponse, response)) {
                                // clear previous accordion content
                                requiredRulesListEl.empty();
                                recommendedRulesListEl.empty();
                                recsAndPoliciesCtrl.buildRuleViolations(response.rules, response.ruleViolations);

                                // For each ruleViolations: 
                                // * group violations by ruleId
                                // * build DOM elements
                                // * get the ruleId and find the matching rule id
                                // * append violation list to matching rule list item
                                var violationsMap = new Map();
                                response.ruleViolations.forEach(function(violation) {
                                    if(violationsMap.has(violation.ruleId)){
                                        violationsMap.get(violation.ruleId).push(violation);
                                     }else{
                                        violationsMap.set(violation.ruleId, [violation]);
                                     }
                                });
    
                                // build list of recommendations
                                response.rules.forEach(function(rule) {
                                    if (rule.enforcementPolicy === 'WARN') {
                                        var requirement = '<div class="rules-list-rule-info"><div>' + rule.name + '</div></div>';
                                        var requirementInfoButton = '<button class="rule-menu-btn"><i class="fa fa-ellipsis-v rules-list-item-menu-target" aria-hidden="true"></i></button>';
                                        recommendations.push(
                                            {
                                                'requirement': requirement,
                                                'requirementInfoButton': $(requirementInfoButton).data('ruleInfo', rule),
                                                'id': rule.id
                                            }
                                        )
                                        recommendationsTotal++;
                                    }
                                });

                                // add class to notification icon for recommended rules
                                var hasRecommendations = response.ruleViolations.findIndex(function(violation) {
                                    return violation.enforcementPolicy === 'WARN';
                                });
                                if (hasRecommendations !== -1) {
                                    $('#recs-and-policies .recs-and-policies-notification-icon ').addClass('recommendations');
                                } else {
                                    $('#recs-and-policies .recs-and-policies-notification-icon ').removeClass('recommendations');
                                }
    
                                // build list of requirements
                                recommendedRuleCountEl.empty().append('(' + recommendationsTotal + ')');
                                recommendations.forEach(function(rec) {
                                    recsAndPoliciesCtrl.buildRuleList('recommendation', violationsMap, rec);
                                });

                                response.rules.forEach(function(rule) {
                                    if (rule.enforcementPolicy === 'ENFORCE') {
                                        var requirement = '<div class="rules-list-rule-info"><div>' + rule.name + '</div></div>';
                                        var requirementInfoButton = '<button class="rule-menu-btn"><i class="fa fa-ellipsis-v rules-list-item-menu-target" aria-hidden="true"></i></button>';
                                        requirements.push(
                                            {
                                                'requirement': requirement,
                                                'requirementInfoButton': $(requirementInfoButton).data('ruleInfo', rule),
                                                'id': rule.id
                                            }
                                        )
                                        requirementsTotal++;
                                    }
                                });

                                // add class to notification icon for required rules
                                var hasViolations = response.ruleViolations.findIndex(function(violation) {
                                    return violation.enforcementPolicy === 'ENFORCE';
                                })
                                if (hasViolations !== -1) {
                                    $('#recs-and-policies .recs-and-policies-notification-icon ').addClass('violations');
                                } else {
                                    $('#recs-and-policies .recs-and-policies-notification-icon ').removeClass('violations');
                                }
    
                                requiredRuleCountEl.empty().append('(' + requirementsTotal + ')');
                                
                                // build violations
                                requirements.forEach(function(rec) {
                                    recsAndPoliciesCtrl.buildRuleList('violation', violationsMap, rec);                              
                                });

                                $('#required-rules').accordion('refresh');
                                $('#recommended-rules').accordion('refresh');
                                // report the updated status
                                previousRulesResponse = response;
    
                                // setup rule menu handling
                                recsAndPoliciesCtrl.setMenuRuleHandling(response);

                                // setup violation menu handling
                                recsAndPoliciesCtrl.setViolationMenuHandling(response, groupId);
                            }
                        }).fail(nfErrorHandler.handleAjaxError);
                    }
                },

                setMenuRuleHandling: function(response) {
                    $('.rule-menu-btn').click(function(event) {
                        var ruleMenuInitialized = false;
                        var ruleInfo = $(this).data('ruleInfo');
                        $('#rule-menu').show();
                        $('#rule-menu').position({
                            my: "left top",
                            at: "left top",
                            of: event
                        });

                        $('#rule-menu-more-info').on( "click", function openRuleMoreInfoDialog() {
                            $('#rule-menu').hide();
                            $('#rule-type-pill').empty()
                                                .removeClass()
                                                .addClass(ruleInfo.enforcementPolicy.toLowerCase() + ' rule-type-pill')
                                                .append(ruleInfo.enforcementPolicy);
                            $('#rule-display-name').empty().append(ruleInfo.descriptors['component-type'].displayName);
                            $('#rule-description').empty().append(ruleInfo.descriptors['component-type'].description);
                            $( "#rule-menu-more-info-dialog" ).modal( "show" );
                            $('#rule-menu-more-info').unbind('click', openRuleMoreInfoDialog);
                        });

                        $('#rule-menu-edit-rule').on('click', function openRuleDetailsDialog() {
                            $('#rule-menu').hide();
                            nfSettings.showSettings().done(function() {
                                nfSettings.selectFlowAnalysisRule(ruleInfo.id);
                            });
                            $('#rule-menu-edit-rule').unbind('click', openRuleDetailsDialog);
                        });

                        $(document).on('click', function closeRuleWindow(e) {
                            if (ruleMenuInitialized && $(e.target).parents("#rule-menu").length === 0) {
                                $("#rule-menu").hide();
                                $(document).unbind('click', closeRuleWindow);
                            }
                            ruleMenuInitialized = true;
                        });
                    });
                },

                setViolationMenuHandling: function(response, groupId) {
                    $('.violation-menu-btn').click(function(event) {
                        var violationMenuInitialized = false;
                        var violationInfo = $(this).data('violationInfo');
                        $('#violation-menu').show();
                        $('#violation-menu').position({
                            my: "left top",
                            at: "left top",
                            of: event
                        });

                        $('#violation-menu-more-info').on( "click", function openRuleMoreInfoDialog() {
                            var rule = response.rules.find(function(rule){ 
                                return rule.id === violationInfo.ruleId;
                            })
                            $('#violation-menu').hide();
                            $('#violation-type-pill').empty()
                                                .removeClass()
                                                .addClass(violationInfo.enforcementPolicy.toLowerCase() + ' violation-type-pill')
                                                .append(violationInfo.enforcementPolicy);
                            $('#violation-display-name').empty().append(violationInfo.violationMessage);
                            $('#violation-description').empty().append(rule.descriptors['component-type'].description);
                            $( "#violation-menu-more-info-dialog" ).modal( "show" );
                            $('#violation-menu-more-info').unbind('click', openRuleMoreInfoDialog);
                            $(document).unbind('click.closeViolationWindow');
                        });

                        $('#violation-menu-go-to').on('click', function goToComponent() {
                            $('#violation-menu').hide();
                            $('#violation-menu-go-to').unbind('click', goToComponent);
                            nfCanvasUtils.showComponent(groupId, violationInfo.subjectId);
                            $(document).unbind('click.closeViolationWindow');
                        });

                        $(document).on('click', function closeViolationWindow(e) {
                            if (violationMenuInitialized && $(e.target).parents("#violation-menu").length === 0) {
                                $("#violation-menu").hide();
                                $(document).unbind('click', closeViolationWindow);
                            }
                            violationMenuInitialized = true;
                        });
                    });
                },

                /**
                 * Initialize the recs and policies controller.
                 */
                init: function () {
                    var recsAndPoliciesCtrl = this;
                    var drawer = this.getDrawerContainer();
                    var requiredRulesEl = $('#required-rules');
                    var recommendedRulesEl = $('#recommended-rules');
                    this.getDrawerButton().click(function () {
                        drawer.toggleClass('opened');
                    });
                    requiredRulesEl.accordion({
                        collapsible: true,
                        active: false,
                        icons: {
                            "header": "fa fa-chevron-down",
                            "activeHeader": "fa fa-chevron-up"
                        }
                    });

                    recommendedRulesEl.accordion({
                        collapsible: true,
                        active: false,
                        icons: {
                            "header": "fa fa-chevron-down",
                            "activeHeader": "fa fa-chevron-up"
                        }
                    });
                    $('#rule-menu').hide();
                    $('#violation-menu').hide();
                    $('#rule-menu-more-info-dialog').modal({
                        scrollableContentStyle: 'scrollable',
                        headerText: 'Rule Information',
                        buttons: [{
                            buttonText: 'OK',
                                color: {
                                    base: '#728E9B',
                                    hover: '#004849',
                                    text: '#ffffff'
                                },
                            handler: {
                                click: function () {
                                    $(this).modal('hide');
                                }
                            }
                        }],
                        handler: {
                            close: function () {}
                        }
                    });
                    $('#violation-menu-more-info-dialog').modal({
                        scrollableContentStyle: 'scrollable',
                        headerText: 'Violation Information',
                        buttons: [{
                            buttonText: 'OK',
                                color: {
                                    base: '#728E9B',
                                    hover: '#004849',
                                    text: '#ffffff'
                                },
                            handler: {
                                click: function () {
                                    $(this).modal('hide');
                                }
                            }
                        }],
                        handler: {
                            close: function () {}
                        }
                    });
                    this.loadFlowPolicies();
                    // TODO: update this to use the specified interval for polling
                    setInterval(this.loadFlowPolicies.bind(this), 5000);

                    // add click event listener to refresh button
                    $('#recs-policies-check-now-btn').on('click', this.createNewFlowRequest);

                    this.toggleOnlyViolations(false);
                    // handle show only violations checkbox
                    $('#show-only-violations').on('change', function(event) {
                        var isChecked = $(this).hasClass('checkbox-checked');
                        recsAndPoliciesCtrl.toggleOnlyViolations(isChecked);
                    });
                },

                toggleOnlyViolations(isChecked) {
                    var requiredRulesEl = $('#required-rules');
                    var recommendedRulesEl = $('#recommended-rules');
                    var ruleViolationsEl = $('#rule-violations');
                    if (isChecked) {
                        requiredRulesEl.hide();
                        recommendedRulesEl.hide();
                        ruleViolationsEl.show();
                        this.loadFlowPolicies();
                    } else {
                        requiredRulesEl.show();
                        recommendedRulesEl.show();
                        ruleViolationsEl.hide();
                        this.loadFlowPolicies();
                    }
                },


                createNewFlowRequest: function () {
                    return $.ajax({
                        type: 'POST',
                        url: `../nifi-api/process-groups/flow-analysis/51deafbb-0187-1000-75c0-e64e509907fb`,
                        dataType: 'json'
                    }).done(function (response) {
                        console.log(response);
                    }).fail(nfErrorHandler.handleAjaxError);
                },

                /**
                 * Toggle/Slide the recs and policies drawer open/closed.
                 */
                toggleRecsAndPoliciesDrawer: function () {
                    var searchCtrl = this;

                    // hide the context menu if necessary
                    nfContextMenu.hide();

                    var isVisible = searchCtrl.getInputElement().is(':visible');
                    var display = 'none';
                    var class1 = 'search-container-opened';
                    var class2 = 'search-container-closed';
                    if (!isVisible) {
                        searchCtrl.getButtonElement().css('background-color', '#FFFFFF');
                        display = 'inline-block';
                        class1 = 'search-container-closed';
                        class2 = 'search-container-opened';
                    } else {
                        searchCtrl.getInputElement().css('display', display);
                    }

                    this.getSearchContainerElement().switchClass(class1, class2, 500, function () {
                        searchCtrl.getInputElement().css('display', display);
                        if (!isVisible) {
                            searchCtrl.getButtonElement().css('background-color', '#FFFFFF');
                            searchCtrl.getInputElement().focus();
                        } else {
                            searchCtrl.getButtonElement().css('background-color', '#E3E8EB');
                        }
                    });
                }
            }

            /**
             * The bulletins controller.
             */
            this.bulletins = {

                /**
                 * Update the bulletins.
                 *
                 * @param response  The controller bulletins returned from the `../nifi-api/controller/bulletins` endpoint.
                 */
                update: function (response) {

                    // icon for system bulletins
                    var bulletinIcon = $('#bulletin-button');
                    var currentBulletins = bulletinIcon.data('bulletins');

                    // update the bulletins if necessary
                    if (nfCommon.doBulletinsDiffer(currentBulletins, response.bulletins)) {
                        bulletinIcon.data('bulletins', response.bulletins);

                        // get the formatted the bulletins
                        var bulletins = nfCommon.getFormattedBulletins(response.bulletins);

                        // bulletins for this processor are now gone
                        if (bulletins.length === 0) {
                            if (bulletinIcon.data('qtip')) {
                                bulletinIcon.removeClass('has-bulletins').qtip('api').destroy(true);
                            }
                        } else {
                            var newBulletins = nfCommon.formatUnorderedList(bulletins);

                            // different bulletins, refresh
                            if (bulletinIcon.data('qtip')) {
                                bulletinIcon.qtip('option', 'content.text', newBulletins);
                            } else {
                                // no bulletins before, show icon and tips
                                bulletinIcon.addClass('has-bulletins').qtip($.extend({},
                                    nfCanvasUtils.config.systemTooltipConfig,
                                    {
                                        content: newBulletins,
                                        position: {
                                            at: 'bottom left',
                                            my: 'top right',
                                            adjust: {
                                                x: 4
                                            }
                                        }
                                    }
                                ));
                            }
                        }
                    }

                    // update controller service and reporting task bulletins
                    nfSettings.setBulletins(response.controllerServiceBulletins, response.reportingTaskBulletins, response.flowAnalysisRuleBulletins);
                }

            }
        }

        FlowStatusCtrl.prototype = {
            constructor: FlowStatusCtrl,

            /**
             * Initialize the flow status controller.
             */
            init: function () {
                this.search.init();
                this.recsAndPolicies.init();
            },

            /**
             * Reloads the current status of the flow.
             */
            reloadFlowStatus: function () {
                var flowStatusCtrl = this;

                return $.ajax({
                    type: 'GET',
                    url: config.urls.status,
                    dataType: 'json'
                }).done(function (response) {
                    // report the updated status
                    if (nfCommon.isDefinedAndNotNull(response.controllerStatus)) {
                        flowStatusCtrl.update(response.controllerStatus);
                    }
                }).fail(nfErrorHandler.handleAjaxError);
            },

            /**
             * Updates the cluster summary.
             *
             * @param summary
             */
            updateClusterSummary: function (summary) {
                // update the connection state
                if (summary.connectedToCluster) {
                    var connectedNodes = summary.connectedNodes.split(' / ');
                    if (connectedNodes.length === 2 && connectedNodes[0] !== connectedNodes[1]) {
                        this.clusterConnectionWarning = true;
                    } else {
                        this.clusterConnectionWarning = false;
                    }
                    this.connectedNodesCount = summary.connectedNodes;
                } else {
                    this.connectedNodesCount = 'Disconnected';
                }
            },

            /**
             * Returns whether there are any terminated threads.
             *
             * @returns {boolean} whether there are any terminated threads
             */
            hasTerminatedThreads: function () {
                if (Number.isInteger(this.terminatedThreadCount)) {
                    return this.terminatedThreadCount > 0;
                } else {
                    return false;
                }
            },

            /**
             * Returns any additional styles to apply to the thread counts.
             *
             * @returns {string}
             */
            getExtraThreadStyles: function () {
                if (Number.isInteger(this.terminatedThreadCount) && this.terminatedThreadCount > 0) {
                    return 'warning';
                } else if (this.activeThreadCount === 0) {
                    return 'zero';
                }

                return '';
            },

            /**
             * Returns any additional styles to apply to the cluster label.
             *
             * @returns {string}
             */
            getExtraClusterStyles: function () {
                if (this.connectedNodesCount === 'Disconnected' || this.clusterConnectionWarning === true) {
                    return 'warning';
                }

                return '';
            },

            /**
             * Update the flow status counts.
             *
             * @param status  The controller status returned from the `../nifi-api/flow/status` endpoint.
             */
            update: function (status) {
                // update the report values
                this.activeThreadCount = status.activeThreadCount;
                this.terminatedThreadCount = status.terminatedThreadCount;

                if (this.hasTerminatedThreads()) {
                    this.threadCounts = this.activeThreadCount + ' (' + this.terminatedThreadCount + ')';
                } else {
                    this.threadCounts = this.activeThreadCount;
                }

                this.totalQueued = status.queued;

                if (this.totalQueued.indexOf('0 / 0') >= 0) {
                    $('#flow-status-container').find('.fa-list').addClass('zero');
                } else {
                    $('#flow-status-container').find('.fa-list').removeClass('zero');
                }

                // update the component counts
                this.controllerTransmittingCount =
                    nfCommon.isDefinedAndNotNull(status.activeRemotePortCount) ?
                        status.activeRemotePortCount : '-';

                if (this.controllerTransmittingCount > 0) {
                    $('#flow-status-container').find('.fa-bullseye').removeClass('zero').addClass('transmitting');
                } else {
                    $('#flow-status-container').find('.fa-bullseye').removeClass('transmitting').addClass('zero');
                }

                this.controllerNotTransmittingCount =
                    nfCommon.isDefinedAndNotNull(status.inactiveRemotePortCount) ?
                        status.inactiveRemotePortCount : '-';

                if (this.controllerNotTransmittingCount > 0) {
                    $('#flow-status-container').find('.icon-transmit-false').removeClass('zero').addClass('not-transmitting');
                } else {
                    $('#flow-status-container').find('.icon-transmit-false').removeClass('not-transmitting').addClass('zero');
                }

                this.controllerRunningCount =
                    nfCommon.isDefinedAndNotNull(status.runningCount) ? status.runningCount : '-';

                if (this.controllerRunningCount > 0) {
                    $('#flow-status-container').find('.fa-play').removeClass('zero').addClass('running');
                } else {
                    $('#flow-status-container').find('.fa-play').removeClass('running').addClass('zero');
                }

                this.controllerStoppedCount =
                    nfCommon.isDefinedAndNotNull(status.stoppedCount) ? status.stoppedCount : '-';

                if (this.controllerStoppedCount > 0) {
                    $('#flow-status-container').find('.fa-stop').removeClass('zero').addClass('stopped');
                } else {
                    $('#flow-status-container').find('.fa-stop').removeClass('stopped').addClass('zero');
                }

                this.controllerInvalidCount =
                    nfCommon.isDefinedAndNotNull(status.invalidCount) ? status.invalidCount : '-';

                if (this.controllerInvalidCount > 0) {
                    $('#flow-status-container').find('.fa-warning').removeClass('zero').addClass('invalid');
                } else {
                    $('#flow-status-container').find('.fa-warning').removeClass('invalid').addClass('zero');
                }

                this.controllerDisabledCount =
                    nfCommon.isDefinedAndNotNull(status.disabledCount) ? status.disabledCount : '-';

                if (this.controllerDisabledCount > 0) {
                    $('#flow-status-container').find('.icon-enable-false').removeClass('zero').addClass('disabled');
                } else {
                    $('#flow-status-container').find('.icon-enable-false').removeClass('disabled').addClass('zero');
                }

                this.controllerUpToDateCount =
                    nfCommon.isDefinedAndNotNull(status.upToDateCount) ? status.upToDateCount : '-';

                if (this.controllerUpToDateCount > 0) {
                    $('#flow-status-container').find('.fa-check').removeClass('zero').addClass('up-to-date');
                } else {
                    $('#flow-status-container').find('.fa-check').removeClass('up-to-date').addClass('zero');
                }

                this.controllerLocallyModifiedCount =
                    nfCommon.isDefinedAndNotNull(status.locallyModifiedCount) ? status.locallyModifiedCount : '-';

                if (this.controllerLocallyModifiedCount > 0) {
                    $('#flow-status-container').find('.fa-asterisk').removeClass('zero').addClass('locally-modified');
                } else {
                    $('#flow-status-container').find('.fa-asterisk').removeClass('locally-modified').addClass('zero');
                }

                this.controllerStaleCount =
                    nfCommon.isDefinedAndNotNull(status.staleCount) ? status.staleCount : '-';

                if (this.controllerStaleCount > 0) {
                    $('#flow-status-container').find('.fa-arrow-circle-up').removeClass('zero').addClass('stale');
                } else {
                    $('#flow-status-container').find('.fa-arrow-circle-up').removeClass('stale').addClass('zero');
                }

                this.controllerLocallyModifiedAndStaleCount =
                    nfCommon.isDefinedAndNotNull(status.locallyModifiedAndStaleCount) ? status.locallyModifiedAndStaleCount : '-';

                if (this.controllerLocallyModifiedAndStaleCount > 0) {
                    $('#flow-status-container').find('.fa-exclamation-circle').removeClass('zero').addClass('locally-modified-and-stale');
                } else {
                    $('#flow-status-container').find('.fa-exclamation-circle').removeClass('locally-modified-and-stale').addClass('zero');
                }

                this.controllerSyncFailureCount =
                    nfCommon.isDefinedAndNotNull(status.syncFailureCount) ? status.syncFailureCount : '-';

                if (this.controllerSyncFailureCount > 0) {
                    $('#flow-status-container').find('.fa-question').removeClass('zero').addClass('sync-failure');
                } else {
                    $('#flow-status-container').find('.fa-question').removeClass('sync-failure').addClass('zero');
                }

            },

            /**
             * Updates the controller level bulletins
             *
             * @param response
             */
            updateBulletins: function (response) {
                this.bulletins.update(response);
            }
        }

        var flowStatusCtrl = new FlowStatusCtrl();
        return flowStatusCtrl;
    };
}));