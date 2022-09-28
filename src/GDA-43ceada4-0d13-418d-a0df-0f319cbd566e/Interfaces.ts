/* Setting interfaces */

/**
 * This file defines all the data structures which might be shared between UI components and printing
 * 
 */

    /** Server setting for plugin.
    * 
    * This you can use to save setting on an instance level (for all projects)
    * The user can edit these in the admin through the Server Setting Page
*/
export interface IServerSettings {
    /** Server Setting example */
    myServerSetting: string;
}      

/** Project setting for plugin
* 
* This you can use to save setting for one specific project.
* The user can edit these in the admin through the Project Setting Page
*/


export interface IGenericDashboard{
    enabled: boolean;
    id: string;
    icon: string;
    title: string;
    parent: string;
    usesFilters: boolean,
    order: number;
    rows: IGenericDashboardRow[];
}
export interface IGenericDashboardRow {

    title: string;
    items: IGenericDashboardItem[];
    height: string;
    additionnalcss: string
}
export interface IGenericDashboardItem{
    title: string;
    cat: string;
    type: "table"| "bargraph" | "piegraph";
    width?: string;
    mode: "mrql" | "itemSelector";
    mrql?: string,
    columns: string[];

}

export interface IFieldMap {
    [key: string]: XRFieldTypeAnnotated
}


export interface IGenericDashboardTable extends IGenericDashboardItem {
    type: "table";
}
export interface IGenericDashboardBarGraph extends IGenericDashboardItem {
    type: "bargraph";
}

export interface IGenericDashboardPieGrah extends IGenericDashboardItem {
    type: "piegraph";
}



export interface IProjectSettings {
    dashboards: IGenericDashboard[];
}



/** Setting for custom fields 
* 
* These allow a user to add parameters to custom field defined by the plugin
* each time it is added to a category
*/
export interface IPluginFieldParameter extends IFieldParameter {
    /** see below */
    options: IPluginFieldOptions;
}

/**  interface for the configuration options of field */
export interface IPluginFieldOptions  {
    // to be defined
}

/** interface for the value to be stored by custom field */
export interface IPluginFieldValue {
    // to be defined
}

/** this allows to store parameters for printing 
* 
* This parameters can be overwritten in the layout and are used by the custom section printing
*/
    export interface IPluginPrintParams extends IPrintFieldParams {
    class:string // default:"". additional class for outermost container
}