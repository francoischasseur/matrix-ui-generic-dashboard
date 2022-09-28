import { IPluginSettingPage } from "./core/PluginCore";
import { IGenericDashboard,  IGenericDashboardRow, IGenericDashboardTable, IProjectSettings } from "./Interfaces";
import { Plugin } from "./Main";

    /* project Setting page closure*/
    export function ProjectSettingsPage():IPluginSettingPage <IProjectSettings>{
        let self: IPluginSettingPage<IProjectSettings> = {};

        if (window["ConfigPage"] !== undefined) {
            self = { ...Object.getPrototypeOf(new ConfigPage()) }
        }

        
        self.getSettingsDOM = (settings:IProjectSettings): JQuery => {
            
            return $(`
                <div class="panel-body-v-scroll fillHeight">
                    <div id="controls"></div>
                    <div id="dashboards"></div>
                </div>
                `);
        };


        self.settings = () => {
            let currentSettings = {};
            if (window["configApp"] !=undefined) {
                let filterSettings = configApp.getJSONProjectSettings(self.getProject(), Plugin.config.projectSettingsPage.settingName);
                if (filterSettings.length == 1)
                    currentSettings = filterSettings[0].value;
            }
            else {
                currentSettings = IC.getSettingJSON(Plugin.config.projectSettingsPage.settingName, {});
            }
            console.log("Returning project settings");
            return { ...Plugin.config.projectSettingsPage.defaultSettings, ...currentSettings }
        };
        self.renderSettingPage = () => {
            self.initPage(
                `${ Plugin.config.projectSettingsPage.title}` ,
                true,
                undefined,
                Plugin.config.projectSettingsPage.help,
                Plugin.config.projectSettingsPage.helpUrl,
                undefined
            );
            self.showSimple();
        };
        self.saveAsync = ()=> {
            let def =  configApp.setProjectSettingAsync(self.getProject(), Plugin.config.projectSettingsPage.settingName, JSON.stringify(self.settingsChanged), configApp.getCurrentItemId());
            def.done(() => {
                self.settingsOriginal = { ...self.settingsChanged };
                self.renderSettingPage();
            })
            return def;
        }
        self.getProject = () => {
            /* get the project id from the setting page */
            return configApp.getCurrentItemId().split("-")[0];
        }
        self.showAdvanced = () => {
            console.debug("Show advanced clicked");
            self.showAdvancedCode(JSON.stringify(self.settingsChanged), function (newCode: string) {
                self.settingsChanged = JSON.parse(newCode);
                self.paramChanged();
               
            });
        };
        self.showSimple = () => {
            $("#simple",app.itemForm).empty();
            self.settingsOriginal = self.settings();
            if (!self.settingsChanged)
                self.settingsChanged  = self.settings();

            let dom = self.getSettingsDOM(self.settingsChanged);
            $("#controls", dom).append($("<button class='btn btn-link '  style='float:right'>Add new dashboard</button>").on("click", () => {
                self.addEditDashboard();
            }))
            self.renderDashboardList(dom);
            $("#simple",app.itemForm).append(dom);
        };
        self.addEditDashboard = (dashboard?: IGenericDashboard) => {
            let addMode = dashboard == null;
            if (!dashboard) {
                dashboard = { enabled: true, title: "", id: "", usesFilters: true, icon: "fal fa-cog", order: 9999, parent: "DASHBOARD", rows: [] };
            }
            let e = new LineEditorExt();
            let lines: ILineEditorLine[] = [
                { help: "Id", value: dashboard.id, type: "textline",required: true  },
                { help: "Title", value: dashboard.title, type: "textline", required: true },
                { help: "Icon", value: dashboard.icon, type: "textline" ,required: true },
                { help: "Order", value: dashboard.order.toString(), type: "number",required: true  },
                { help: "Parent", value: dashboard.parent, type: "textline",required: true  },
                { help: "Enabled", value: dashboard.enabled.toString(), type: "boolean"  },
                { help: "Uses filters", value:  dashboard.usesFilters.toString(), type: "boolean" },
            ];
            e.showDialog(addMode ? "Add a new dashboard": "Edit a dashboard", 600, lines, (newLines) => {

                let newDashboard: IGenericDashboard = {
                    ...dashboard,
                    id: newLines[0].value,
                    title: newLines[1].value,
                    icon: newLines[2].value,
                    order: parseInt(newLines[3].value),
                    parent: newLines[4].value,
                    enabled: <boolean> <unknown> newLines[5].value,
                    usesFilters: <boolean> <unknown>  newLines[6].value
                };
                // Check if the id is unique
                if (addMode) { 
                    if (self.settingsChanged.dashboards.find(d => d.id == newDashboard.id)) {
                        alert("The id must be unique");
                        return false;
                    }
                    self.settingsChanged.dashboards.push(newDashboard);
                    self.paramChanged();
                    self.showSimple();
                    return true;
                }
                else {
                    let index = self.settingsChanged.dashboards.indexOf(dashboard);
                    self.settingsChanged.dashboards[index] = newDashboard;
                    self.paramChanged();
                    self.showSimple();
                    return true;
                }
                
            });

        };
        self.renderDashboardList = (dom: JQuery) => { 

            $("#dashboards", dom).empty();
            let table = $("<table class='table table-striped table-hover'></table>");
            let header = $("<thead><tr><th>Title</th><th>Order</th><th>Parent</th><th>Enabled</th><th>Uses filters</th><th></th></tr></thead>");
            table.append(header)
            $("#dashboards", dom).append(table);
            self.settingsChanged.dashboards.forEach(dashboard => {

                let row = $("<tr></tr>");
                row.append($(`<td> <span> ${dashboard.id} - ${dashboard.title}</span> </td>`).prepend(`<i class="${dashboard.icon}"></i>`));
                row.append($(`<td>${dashboard.order}</td>`));
                row.append($(`<td>${dashboard.parent}</td>`));
                row.append($(`<td>${dashboard.enabled ?'<i class="fal fa-check-square"></i>':'<i class="fal fa-square"></i>'}</td>`));
                row.append($(`<td>${dashboard.usesFilters?'<i class="fal fa-check-square"></i>':'<i class="fal fa-square"></i>' }</td>`));
                let actions = $("<td></td>");
                actions.append($(`<button class='btn btn-link btn-sm'><i class='fal fa-edit'></i></button>`).on("click", () => {
                    self.addEditDashboard(dashboard);

                }));
                actions.append($(`<button class='btn btn-link btn-sm'><i class='fal fa-chart-line'></i></button>`).on("click", () => {
                   addEditDashboardLines(self, dashboard);
                }));

                actions.append($(`<button class='btn btn-link btn-sm'><i class='fa fa-trash-alt'></i></button>`).on("click", () => {
                }));
                row.append(actions);
                table.append(row);
            });


        }

        self.paramChanged = () => {
            configApp.itemChanged(JSON.stringify(self.settingsOriginal) != JSON.stringify(self.settingsChanged));
        }
        return self;
    }
function displayRowTable(ui: JQuery, self:IPluginSettingPage <IProjectSettings>, dashboard: IGenericDashboard) {
    ui.empty();
    let addButton = $("<button class='btn btn-link ' style='float:right'>Add new line</button>").on("click", () => {
        addEditDashboardRow(self, dashboard);
    });
    ui.append(addButton);
    let table = $("<table class='table table-striped table-hover'></table>");
    ui.append(table);
    let header = $("<thead><tr><th>Title</th><th>Height</th><th>Panels</th><th></th></tr></thead>");
    table.append(header)
    dashboard.rows.forEach(row => { 
        let tr = $("<tr></tr>");
        tr.append($(`<td>${row.title }</td>`));
        tr.append($(`<td>${row.height}</td>`));
        let panels = $("<td></td>");
        panels.append($(`<button class='btn btn-link btn-sm'><i class='fal fa-plus-circle'></i></button>`).on("click", (event) => { 
            $("#addPanelCtxMenu").remove();
            let contextMenu = $(`<div id="addPanelCtxMenu" style="display:block; background:white; padding:5px; position: absolute; z-index:99999; border:solid 1px #AAA; "></div>`);
            contextMenu.appendTo("body");
            contextMenu.append($("<ul></ul>"));
            
            $("ul", contextMenu).append("<li><a href='#'>Add a new table</a></li>").on("click", () => {
                addEditTable(row, self);
                contextMenu.hide();
             });
            
            $("ul", contextMenu).append("<li><a href='#'>Add a new pie chart</a></li>").on("click", () => {
                contextMenu.hide();
            });

            $("ul", contextMenu).append("<li><a href='#'>Add a new bar chart</a></li>").on("click", () => {
                contextMenu.hide();
             });
            contextMenu.css("left", event.pageX);
            contextMenu.css("top", event.pageY);            
        }));

        for (let i = 0; i < row.items.length; i++) {
            let panel = row.items[i];
            let panelButton = $("<button class='btn btn-link btn-sm'></button>");
            panelButton.append($(`<i class='fal fa-table'></i>`));
            panelButton.on("click", () => {
                if (panel.type == "table") {
                    addEditTable(row, self, <IGenericDashboardTable>panel);
                }
            });
            panels.append(panelButton);
        }



        tr.append(panels);


        let actions = $("<td></td>");
        actions.append($(`<button class='btn btn-link btn-sm'><i class='fal fa-edit'></i></button>`).on("click", () => {
            addEditDashboardRow(self, dashboard, row).then(() => { displayRowTable(ui, self, dashboard) });
        }));
        tr.append(actions);
        table.append(tr);
    });
    }
function addEditDashboardLines(self: IPluginSettingPage<IProjectSettings>, dashboard: IGenericDashboard) {
    
    let dlg = $("<div>").appendTo($("body"));
    let ui = $("<div style='height:100%;width:100%'>");
    
    displayRowTable(ui,self, dashboard);

    ml.UI.showDialog(dlg, "Adding lines", ui, 800,600,
        [{
            text: 'Okay',
            class: 'btnDoIt',
            click: function () {


                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (<any>dlg).dialog("close");
            }
        }, {
            text: 'Cancel',
            class: 'btnCancelIt',
            click: function () {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (<any>dlg).dialog("close");
            }
        }],
        UIToolsEnum.Scroll.Vertical,
        true,
        true,
        () => {
            dlg.remove();
        },
        () => {
        },
        () => { }
    );
}

function addEditDashboardRow(self: IPluginSettingPage<IProjectSettings>, dashboard: IGenericDashboard, row?: IGenericDashboardRow):JQueryDeferred<void> {
    let leditor = new LineEditor();
    let defered = $.Deferred();

    let newRow: IGenericDashboardRow = { title: "", additionnalcss: "", height: "", items: [] };
    if (row) {
        newRow = { ...newRow, ...row };
     }
    let editorLines: ILineEditorLine[] = [{ help: "Title", value: newRow.title, type: "textline",required: true  },
        { help: "Height", value: newRow.height, type: "textline",required: false  },
        { help: "Additionnal CSS", value: newRow.additionnalcss, type: "textline"}];
     
    leditor.showDialog("Add a new line", 350, editorLines, (newLines) => { 

        newRow.title = newLines[0].value;
        newRow.height = newLines[1].value;
        newRow.additionnalcss = newLines[2].value;
        if (row)
        {
            let index = dashboard.rows.indexOf(row); 
            dashboard.rows[index] = newRow;
        }
        else {
            dashboard.rows.push(newRow);
        }
        self.paramChanged();
        defered.resolve();
        return true;
    });
    return defered;
}

function addEditTable(row: IGenericDashboardRow, self: IPluginSettingPage<IProjectSettings>, table?: IGenericDashboardTable):JQueryDeferred<void> {
    
    let lEditor = new LineEditor();
    let defered = $.Deferred();
    let newTable: IGenericDashboardTable = { title: "", cat: "", columns: [], mrql: "", type: "table", width: "100%", mode:"itemSelector" };
    if (table) {
        newTable = { ...newTable, ...table };
    }       

    let allField: IDropdownOption[] = [];
    let allCat = IC.getCategories().filter(c=> c!= "REPORT").filter(c=> c!= "DOC").filter(c=> c!= "SIGN").filter(c=> c!= "FOLDER")
    for (let cat of allCat) {

        let fields = IC.getFields(cat);
        for (let field of fields) {
            allField.push({ id: cat+"#"+field.label, label: "[" +cat + "] " + field.label });
        }
    }

    let editorLines: ILineEditorLine[] = [{ help: "Title", value: newTable.title, type: "textline", required: true },
        { help: "Width", value: newTable.width, type: "textline", required: false },
        { help:"mode", value:newTable.mode, type:"select", options:[{id:"itemSelector", label:"Item selector"}, {id:"mrql", label:"MRQL"}], required:true},
        { help: "Mrql", value: newTable.mrql, type: "textline", required: false },
        { help: "Category", value: newTable.cat, type: "select", required: false, options: allCat.map((c => { return { id: c, label: c } })) },
        { help: "Columns", multiple: true, value: newTable.columns.join(","), type: "select", required: true , options: allField }];

    lEditor.showDialog("Add a new panel", 900, editorLines, (newLines) => { 

        newTable.title = newLines[0].value;
        newTable.width = newLines[1].value;
        newTable.mode = newLines[2].value == "itemSelector" ? "itemSelector" : "mrql";
        newTable.mrql = newLines[3].value;
        newTable.cat = newLines[4].value;
        newTable.columns = newLines[5].value.split(",");
        if (table)
        {   
            let index = row.items.indexOf(table);
            row.items[index] = newTable;
        }
        else {
            row.items.push(newTable);
        }

        self.paramChanged();
        defered.resolve();
        return true;
    });

    return defered;
}

