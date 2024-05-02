<%--
 Licensed to the Apache Software Foundation (ASF) under one or more
  contributor license agreements.  See the NOTICE file distributed with
  this work for additional information regarding copyright ownership.
  The ASF licenses this file to You under the Apache License, Version 2.0
  (the "License"); you may not use this file except in compliance with
  the License.  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
--%>
<%@ page contentType="text/html" pageEncoding="UTF-8" session="false" %>
<div id="show-flow-changes-dialog" layout="column" class="hidden large-dialog">
    <div class="dialog-content">
        <div class="setting flow-changes-message">
            <span id="show-flow-changes-message"></span>
        </div>
        <div id="show-flow-changes-filter-controls">
            <div id="show-flow-changes-filter-status" class="filter-status">
                Displaying&nbsp;<span id="displayed-show-flow-changes-entries"></span>&nbsp;of&nbsp;<span id="total-show-flow-changes-entries"></span>
            </div>
            <div id="show-flow-changes-filter-container">
                <input type="text" id="show-flow-changes-filter" placeholder="Filter"/>
            </div>
        </div>
        <div id="show-flow-changes-table" class="show-flow-changes-table"></div>
    </div>
</div>