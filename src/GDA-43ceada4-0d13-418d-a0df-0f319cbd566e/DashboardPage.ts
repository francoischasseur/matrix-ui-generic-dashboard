import { IFieldMap, IGenericDashboard, IGenericDashboardItem, IGenericDashboardTable, IProjectSettings } from "./Interfaces";
import { Plugin } from "./Main";

// eslint-disable-next-line no-unused-vars
export class DashboardPage {
    settings: IProjectSettings;
    dashboard: IGenericDashboard; 

    constructor(dashboard: IGenericDashboard) {
        this.settings = { ...Plugin.config.projectSettingsPage.defaultSettings, ...IC.getSettingJSON(Plugin.config.projectSettingsPage.settingName, {}) } ;
        this.dashboard = dashboard;
    }

    /** Customize static HTML here */
    private getDashboardDOM(): JQuery {
        return $(`<style>
        .generic-dashboard-panel .btn[disabled] {
            opacity: 1 !important;
        }
        .generic-dashboard-panel .panel-options {
            padding-left: 15px;
        }
        </style>`);
    }

    /** Add interactive element in this function */
    renderProjectPage() {

        const control = this.getDashboardDOM();
        app.itemForm.append(
            ml.UI.getPageTitle(
                this.dashboard.title,
                () => {
                    return control;
                },
                () => {
                    this.onResize();
                }
            )
        );
        let container = $(`<div class="panel-body-v-scroll fillHeight"  style="max-height:calc(100% - 120px)"/>`);
        app.itemForm.append(container);


        this.dashboard.rows.forEach(row => {

            let divRow = $("<div class='' style='display:flex;'/> ");

            if (row.height != undefined) {
                divRow.css("height", row.height);
            }

            if (row.additionnalcss != undefined) {
              divRow.attr("style", divRow.attr("style") + row.additionnalcss);
            }
            container.append(divRow);

            row.items.forEach(element => {
                this.renderElement(element, divRow);

            });

        });


        app.itemForm.append(control);
    }
    static getPanel(element: IGenericDashboardItem, render:(element: IGenericDashboardItem, items?:ISelectedElement[])=>void ): JQuery {
        let panel = $(`<div class="panel panel-default generic-dashboard-panel" style="margin:5px;">
                          <div class="panel-heading">
                              <h3 class="panel-title" >${element.title}</h3>
                             
                          </div>
                          <div class="panel-options"></div>
                          <div class="panel-body" style="overflow-y:auto; max-height:calc(100% - 40px)"></div>
                      </div>`);
        panel.css("width", element.width);
        ml.UI.copyBuffer($(".panel-heading h3", panel), "Copy  to clipboard", $(".panel-body", panel), panel, (copied: JQuery) => {

            ml.UI.fixC3ForCopy(copied);

            let $temp = $("<div>");
            $("body").append($temp);

            $temp.attr("contenteditable", "true")
                .html(panel.html()).select()
                .on("focus", function () { document.execCommand('selectAll', false, null); })
                .focus();
            document.execCommand("copy");
            $temp.remove();

        });

        if (element.mode == "itemSelector") { 
            let baseControl = $("<div>").appendTo($(".panel-options", panel));
            let itemSelector = new ItemSelectionImpl(baseControl);

            let selection = projectStorage.getItem(element.cat + "_" + element.title);
           
            itemSelector.init({
                canEdit: true,
                controlState: ControlState.FormEdit,
                help: "",
                valueChanged: () => {
                    
                    let v = itemSelector.getValue();
                    let items:ISelectedElement[] = JSON.parse(v);
                    if (items != undefined)
                        render(element, items);
                    projectStorage.setItem(element.cat+"_"+element.title, JSON.stringify(items.map(item=> item.to)));
                    
                    
                },
                parameter: {
                    prefix: "Include the following Items :",
                    buttonName: "Select items/folder(s)",
                    showOnly: [element.cat],
                    singleFolderOnly:false,
                }
            });
            
            if (selection ) {
                let parsedSelection:string[] = JSON.parse(selection);
                if(parsedSelection.length>0)
                    itemSelector.setValue(parsedSelection);
            }

        }
        
        return panel;

    }


    renderElement(element: IGenericDashboardItem, divRow: JQuery<HTMLElement>) {
        let that = this;
        let render = async (element: IGenericDashboardItem, items?: ISelectedElement[]) => {
            let needles = undefined;
            let mrqlQuery =this.buildMrql(element,items);
            needles = await restConnection.getProject(mrqlQuery);
            let panelBody = $(".panel-body", panel);
            panelBody.empty();
            switch (element.type) {
                case "table":
                    that.renderTable(<IGenericDashboardTable> element, panelBody, needles);
            }
        }
        let panel = DashboardPage.getPanel(element, render);

        if (element.mode != "itemSelector") {
            render(element);
        }

        divRow.append(panel);
       
    }
    buildMrql(element: IGenericDashboardItem, items):string{
        
        let fieldsOut = [];
        let links = ["down", "up"];
        let fields = this.getFields(element.cat, element.columns);
        for (let key in fields) {
            fieldsOut.push(fields[key]);
        }
       

        let mrqlPart = ""
        if (element.mode != "itemSelector" && element.mrql != undefined) {
            mrqlPart += " AND " + element.mrql;
        }
        else {
            let itemsQueryParts = items.map((item) => {
                if (item.to && item.to[0] === 'F')
                    return " folderm =  " + item.to;
                else
                    return " id = " + item.to;
            });
            mrqlPart += " AND (" + itemsQueryParts.join(" OR ") + ")";
        }

        let linksQueryPart = "";
        if (links.length > 0) {
            linksQueryPart = "&links=" + links.join(",");
        }
        let mrql = `needle?search=mrql: category=${element.cat}${mrqlPart}&labels=1&fieldsOut=${fieldsOut.map((o) => { return o.id }).join(',')}${linksQueryPart}`;

        return mrql;
    }
    getFields(cat: string, columns: string[]): IFieldMap {
        let params: IFieldMap = {};
        if (columns != undefined) {
            columns.forEach((e) => {
                params[e] = IC.getFieldByName(cat, e.split("#")[1]);
            })
        }
        return params;
    }
    renderTable(element: IGenericDashboardTable, panel: JQuery<HTMLElement>, result: XRGetProject_Needle_TrimNeedle) {
       
        let table = $("<table class='table table-striped table-bordered table-hover' />");
        let thead = $("<thead />");
        let tbody = $("<tbody />");
        let fields = this.getFields(element.cat, element.columns);


        table.append(thead);
        table.append(tbody);
        $( panel).append(table);

        let columns = element.columns;
        let theadRow = $("<tr />");
        thead.append(theadRow);
        theadRow.append($("<th />").text("ID"));
        columns.forEach(column => {
            theadRow.append($("<th />").text(column.split("#")[1]));
        });

        result.needles.forEach(needle => {
            let tr = $("<tr />");
            tr.append($("<td />").text(ml.Item.parseRef(needle.itemOrFolderRef).id + "!"));
            tbody.append(tr);
            columns.forEach(column => {
                let td = $("<td />");
                let field = fields[column];
                td.append(this.renderFieldValue(field, needle, element ))
                tr.append(td);
                
            });
        });
        $("table",app.itemForm).highlightReferences();
    }
    renderFieldValue(field: XRFieldTypeAnnotated, needle: XRTrimNeedleItem,element: IGenericDashboardTable):JQuery<HTMLElement> {


        let output = $("<span/>");

        let fieldType = field.fieldType;
        let ui: IControlDefinition = { control: output };

        //Handle special case of references
        if (fieldType == "links") {
            ui.control.append($("<ul/>"));
            if (needle.downLinkList != undefined)
                needle.downLinkList.forEach((item) => {
                    $("ul", ui.control).append($("<li>").refLink({
                        id: ml.Item.parseRef(item.itemRef).id, title: item.title, style: refLinkStyle.link, tooltip: refLinkTooltip.html, hideTitle: false
                    }))
                });
                return output;

        } else if (fieldType == "uplinkinfo") {
            ui.control.append($("<ul/>"));
            if (needle.upLinkList != undefined)
                needle.upLinkList.forEach((item) => {
                    $("ul", ui.control).append($("<li>").refLink({
                        id: ml.Item.parseRef(item.itemRef).id, title: item.title, style: refLinkStyle.link, tooltip: refLinkTooltip.html, hideTitle: false
                    }))
                });
                return output;

        }



        let idx = IC.getItemConfiguration(element.cat).fieldList.findIndex(o => o.id == field.id);
        let valueIdx = needle.fieldVal.findIndex(o => o.id == field.id);
        if (idx == -1 || (fieldType != "labels" && valueIdx == -1))
            return;
        let ctrlParameter = { canEdit: false, fieldValue: "", isItem: true, help: "", controlState: ControlState.Tooltip, parameter: IC.getItemConfiguration(element.cat).fieldList[idx].parameterJson };
        ctrlParameter.parameter.inlineHelp = "";

        if (fieldType != "labels") {
            ctrlParameter.fieldValue = needle.fieldVal[valueIdx].value;
        }
        else {

            let labels: string[] = [];
            if (needle.labels != undefined) {

                labels = needle.labels.replace(/\(|\)/g, "").split(",");
                ctrlParameter.fieldValue = JSON.stringify(labels);
                ctrlParameter.parameter = { titleBarControl: ui.control };

            }
        }


        if (fieldType === "report") {
            ui.control.plainText(ml.JSON.setOptions(ctrlParameter, { parameter: { rows: 1 } }));
            EmbeddedReport(ml.JSON.setOptions(ctrlParameter, { control: ui.control }));
        } else if (fieldType === "richtext") {
            ui.control.richText(ctrlParameter);
        } else if (fieldType === "publishedItemList") {
            ui.control.hidden(ctrlParameter);
        } else if (fieldType === "publishedFilesList") {
            ui.control.hidden(ctrlParameter);
        } else if (fieldType === "publishedContent") {
            ui.control.publishedContent(ctrlParameter);
        } else if (fieldType === "text") {
            ui.control.plainText(ctrlParameter);
        }
        else if (fieldType === "fileManager" || fieldType === "signCache") {
            ui.control.fileManager(ml.JSON.setOptions(ctrlParameter, { parameter: {} }));
        } else if (fieldType === "docFilter") {
            ui.control.docFilter(ml.JSON.setOptions(ctrlParameter, { help: "Document Filter" }));
        } else if (fieldType === "workflow") {
            ui.control.workflowControl(<unknown>ml.JSON.setOptions(ctrlParameter, { parameter: {} }));
        } else if (fieldType === "sourceRef") {
            // type should not exist 
            ml.Logger.log("warning", "Found obsolete type sourceRef");
            ui.control.hidden(ctrlParameter);
        } else if (fieldType === "textline" || fieldType === "publishedTitle") {
            ui.control.plainText(ml.JSON.setOptions(ctrlParameter, { parameter: { rows: 1, allowResize: false } }));
        } else if (fieldType === "signatureControl") {
            ui.control.docSign(ctrlParameter);
        } else if (fieldType === "docReview") {
            ui.control.docReview(<unknown>ctrlParameter);
        } else if (fieldType === "user") {

            let userDropdown = ml.UI.SelectUserOrGroup.getUserDropDownOptions(
                !ml.JSON.isFalse((<IUserSelect>ctrlParameter).parameter.showUsers), // by default show users, if not specified
                ml.JSON.isTrue((<IUserSelect>ctrlParameter).parameter.showGroups)); // by default do not show groups

            let groups: IDropdownGroup[] = null;
            if (!ml.JSON.isFalse((<IUserSelect>ctrlParameter).parameter.showUsers) && ml.JSON.isTrue((<IUserSelect>ctrlParameter).parameter.showGroups)) {
                groups = [];
                groups.push({ value: "groups", label: "groups" });
                groups.push({ value: "users", label: "users" });
            }
            ui.control.mxDropdown(ml.JSON.setOptions(ctrlParameter, {
                parameter: {
                    placeholder: (<IUserSelect>ctrlParameter).parameter.placeholder ? (<IUserSelect>ctrlParameter).parameter.placeholder : "select user",
                    // allow only users in project!
                    create: false,
                    options: userDropdown,
                    maxItems: (<IUserSelect>ctrlParameter).parameter.maxItems ? (<IUserSelect>ctrlParameter).parameter.maxItems : 1,
                    groups: groups
                }
            }));

        } else if (fieldType === "date") {
            ui.control.dateselect(ctrlParameter);
        } else if (fieldType === "dropdown") {
            ui.control.mxDropdown(ctrlParameter);
        } else if (fieldType === "crosslinks") {
            ui.control.itemSelection(ml.JSON.setOptions(ctrlParameter, {
                parameter: {
                    linkTypes: (<IItemSelectionOptions>ctrlParameter).parameter.linkTypes ? (<IItemSelectionOptions>ctrlParameter).parameter.linkTypes : [],
                    crossProject: true,
                    prefix: (<IItemSelectionOptions>ctrlParameter).parameter.prefix ? (<IItemSelectionOptions>ctrlParameter).parameter.prefix : "Links",
                }
            }));
        } else if (fieldType === "steplist") {
            ui.control.tableCtrl(ml.JSON.setOptions(ctrlParameter, {
                columns: [{ name: "Action", field: "action" }, { name: "Expected Behaviour", field: "expected" }]
            }));
        } else if (fieldType === "risk") {
            ui.control.riskCtrl(ml.JSON.setOptions(ctrlParameter, {
            }));
        } else if (fieldType === "risk2") {
            ui.control.riskCtrl2(<unknown>ml.JSON.setOptions(ctrlParameter, {
            }));
        } else if (fieldType === "checkbox") {
            ui.control.checkBox(ctrlParameter);
        } else if (fieldType === "htmlForm") {
            ui.control.htmlform(ctrlParameter);
        } else if (fieldType === "hidden" || fieldType === "filter_file" || fieldType === "signature") {
            ui.control.hidden(ctrlParameter);
        } else if (fieldType === "hyperlink") {
            ui.control.hyperlink(ctrlParameter);
        } else if (fieldType === "colorPicker") {
            ui.control.colorPicker(ctrlParameter);
        } else if (fieldType === "reportId") {
            ui.control.hidden(ctrlParameter);
        } else if (fieldType === "dhf") {
        } else if (fieldType === "sourceref") {
            ui.control.sourceRef(ctrlParameter);
        } else if (fieldType === "markAsTemplate") {
            ui.control.markAsTemplate(ctrlParameter);
     
        } else if (fieldType === "versionLive") {
            ui.control.hidden(ctrlParameter);
        } else if (fieldType === "version") {
            ui.control.hidden(ctrlParameter);
        } else if (fieldType === "labels") {
            ctrlParameter.canEdit = true;
            ui.control.labelsControl(<unknown>ml.JSON.setOptions(ctrlParameter, { type: element.cat, isItem: true, controlState: ControlState.Tooltip, canEdit: true }));
        } else if (fieldType === "syncSourceInfo") {
            ui.control.syncSourceInfo(ctrlParameter);
        } else if (fieldType === "cascadingSelect") {
            ui.control.cascadingSelect(<unknown>ctrlParameter);
        } else if (fieldType === "gateControl") {
            ui.control.gateControl(<IGateControlControlOptions>ctrlParameter);
        }
        else {
            ui.control.errorControl(ctrlParameter);
        }
        return output;

    }
  
    onResize() {
        /* Will be triggered when resizing. */
    }
}
