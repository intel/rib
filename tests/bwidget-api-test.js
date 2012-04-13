/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
var testedPassed = 0;
var testedTotal = 0;

function resetTestStats() {
    document.getElementById("results").innerHTML = "";
    document.getElementById("output").innerHTML = "Details:<br>\n";
    testedPassed = 0;
    testedTotal = 0;
}

function reportTestResults() {
    var ratio = Math.round(testedPassed * 1000 / testedTotal), html, output;
    html = '<p class="results">RESULTS: ' + testedPassed + " of " +
        testedTotal + " tests (" + (ratio / 10.0) + "%) passed</p>\n";
    document.getElementById("results").innerHTML = html;
}

function assert(string, expected, actual, equalityFunc) {
    var html = '<span class="';
    testedTotal++;
    if ((equalityFunc && (equalityFunc(expected, actual))) ||
        (expected === actual)) {
        html += 'pass">[PASS] ' + string;
        testedPassed++;
    }
    else if (expected == actual) {
        html += 'fuzz">[FUZZ] ' + string + "<br>\n";
        html += "*** Expected '" + expected + "' (" + typeof expected +
            ") but got '" + actual + "' (" + typeof actual + ")";
    }
    else {
        html += 'fail">[FAIL] ' + string + "<br>\n";
        html += "*** Expected '" + expected + "' (" + typeof expected +
            ") but got '" + actual + "' (" + typeof actual + ")";
    }
    html += "</span><br>\n";
    document.getElementById("output").innerHTML += html;
}

function expectException(string, func, arg1, arg2, arg3, arg4, argX) {
    var value = false;
    if (argX != undefined) {
        throw new Error("expectException only supports up to four args");
    }

    try {
        func(arg1, arg2, arg3, arg4);
    }
    catch(e) {
        value = true;
    }
    finally {
        assert(string, true, value);
    }
}

function arrayEquality(array1, array2) {
    var length = array1.length, i;
    if (length != array2.length) {
        return false;
    }
    for (i = 0; i < length; i++) {
        if (array1[i] !== array2[i]) {
            return false;
        }
    }
    return true;
}

function testWidgets() {
    var rval, length, i, existing, expect;

    resetTestStats();

    // expect 12 widget types as of 7-Nov-11
    expect = 12;
    length = 0;
    for (i in BWidgetRegistry) {
        if (BWidgetRegistry.hasOwnProperty(i)) {
            length++;
        }
    }
    assert("BWidgetRegistry: Found " + length + " of " + expect +
           " widget types", expect, length);

    // expect 8 palette widget types as of 7-Nov-11
    expect = 8;
    rval = BWidget.getPaletteWidgetTypes();
    length = rval.length;
    assert("getPaletteWidgetTypes(): Found " + length + " of " + expect +
           " palette widget types", expect, length);

    // test typeExists() function
    existing = 0;
    for (i = 0; i < length; i++) {
        if (BWidget.typeExists(rval[i])) {
            existing++;
        }
    }
    if (BWidget.typeExists("Nonexistent")) {
        existing++;
    }
    assert("typeExists(): Checking known and unknown types", length, existing);

    // test getDisplayLabel
    assert("getDisplayLabel(): Checking Button label", "Button",
           BWidget.getDisplayLabel("Button"));
    assert("getDisplayLabel(): Checking Slider label", "Slider",
           BWidget.getDisplayLabel("Slider"));
    assert("getDisplayLabel(): Checking invalid widget type", "",
           BWidget.getDisplayLabel("Nonexistent"));

    // test getIcon
    // TODO: improve getIcon tests when it does something useful
    assert("getIcon(): Checking Header icon", "ui-icon-pencil",
           BWidget.getIcon("Header"));

    // test getPropertyTypes
    rval = BWidget.getPropertyTypes("Button");
    assert("getPropertyTypes(): Checking id property on Button",
           "string", rval["id"]);
    assert("getPropertyTypes(): Checking text property on Button",
           "string", rval["text"]);
    assert("getPropertyTypes(): Checking nonexistent property on Button",
           undefined, rval["nonexistent"]);

    expectException("getPropertyTypes(): Checking invalid widget type",
                    BWidget.getPropertyTypes, "Nonexistent");

    // TODO: test getPropertyOptions

    // test getPropertyDefaults
    rval = BWidget.getPropertyDefaults("Button");
    assert("getPropertyDefaults(): Checking default id for Button",
           "", rval.id);
    assert("getPropertyDefaults(): Checking default text for Button",
           "Button", rval.text);
    assert("getPropertyDefaults(): Checking nonexistent default for Button",
           undefined, rval.nonexistent);

    // FIXME: this FAILs because it inherits a default from Base
    //        not sure whether to change the behavior or call it good
    /*
    assert("getPropertyDefaults(): Checking nonexistent id for Page",
           undefined, rval.id);
    */

    expectException("getPropertyDefaults(): Checking invalid widget type",
                    BWidget.getPropertyDefaults, "Nonexistent");

    // test getPropertySchema
    rval = BWidget.getPropertySchema("Button", "id");
    assert("getPropertySchema(): Checking type of Button id property",
           "string", rval.type)
    assert("getPropertySchema(): Checking defaultValue of Button id property",
           "", rval.defaultValue)
    assert("getPropertySchema(): Checking autoGenerate of Button id property",
           undefined, rval.autoGenerate)
    
    rval = BWidget.getPropertySchema("Page", "id");
    assert("getPropertySchema(): Checking type of Button id property",
           "string", rval.type)
    assert("getPropertySchema(): Checking defaultValue of Button id property",
           undefined, rval.defaultValue)
    assert("getPropertySchema(): Checking autoGenerate of Button id property",
           "page", rval.autoGenerate)

    expectException("getPropertySchema(): Checking invalid widget type",
                    BWidget.getPropertySchema, "Nonexistent", "id");
    expectException("getPropertySchema(): Checking invalid property",
                    BWidget.getPropertySchema, "Button", "nonexistent");

    // test getPropertyType
    assert("getPropertyType(): Checking type of Base id property",
           "string", BWidget.getPropertyType("Base", "id"));
    assert("getPropertyType(): Checking type of Header text property",
           "string", BWidget.getPropertyType("Header", "text"));
    assert("getPropertyType(): Checking type of Slider value property",
           "integer", BWidget.getPropertyType("Slider", "value"));

    expectException("getPropertyType(): Checking invalid widget type",
                    BWidget.getPropertyType, "Nonexistent", "id");
    expectException("getPropertyType(): Checking invalid property",
                    BWidget.getPropertyType, "Button", "nonexistent");

    // test getPropertyDefault
    assert("getPropertyDefault(): Checking Button text default",
           "Button", BWidget.getPropertyDefault("Button", "text"));
    assert("getPropertyDefault(): Checking Slider value default",
           50, BWidget.getPropertyDefault("Slider", "value"));
    assert("getPropertyDefault(): Checking Slider id default",
           undefined, BWidget.getPropertyDefault("Slider", "id"));

    expectException("getPropertyDefault(): Checking invalid widget type",
                    BWidget.getPropertyDefault, "Nonexistent", "id");
    expectException("getPropertyDefault(): Checking invalid property",
                    BWidget.getPropertyType, "Button", "nonexistent");

    // test getPropertyAutoGenerate
    assert("getPropertyAutoGenerate(): Checking Button id autogen prefix",
           "page", BWidget.getPropertyAutoGenerate("Page", "id"));
    assert("getPropertyAutoGenerate(): Checking Slider id autogen prefix",
           "slider", BWidget.getPropertyAutoGenerate("Slider", "id"));
    assert("getPropertyAutoGenerate(): Checking TextInput id autogen prefix",
           undefined, BWidget.getPropertyAutoGenerate("TextInput", "id"));

    expectException("getPropertyAutoGenerate(): Checking invalid widget type",
                    BWidget.getPropertyAutoGenerate, "Nonexistent", "id");
    expectException("getPropertyAutoGenerate(): Checking invalid property",
                    BWidget.getPropertyType, "Button", "nonexistent");

    // test propertyExists
    assert("propertyExists(): Checking Button text property",
           true, BWidget.propertyExists("Button", "text"));
    assert("propertyExists(): Checking Slider max property",
           true, BWidget.propertyExists("Slider", "max"));
    assert("propertyExists(): Checking TextInput foo property",
           false, BWidget.propertyExists("TextInput", "foo"));

    expectException("propertyExists(): Checking invalid widget type",
                    BWidget.propertyExists, "Nonexistent", "id");

    // test getTemplate
    assert("getTemplate(): Checking Page template",
           '<div data-role="page" id="%UID%"></div>',
           BWidget.getTemplate("Page"));
    assert("getTemplate(): Checking Base template",
           "", BWidget.getTemplate("Base"));
    
    expectException("getTemplate(): Checking invalid widget type",
                    BWidget.getTemplate, "Nonexistent", "id");

    // test getRedirect
    rval = BWidget.getRedirect("Page");
    assert("getRedirect(): Checking Page redirect zone", "content", rval.zone);
    assert("getRedirect(): Checking Page redirect type", "Content", rval.type);
    assert("getRedirect(): Checking Header redirect",
           undefined, BWidget.getRedirect("Header"));

    expectException("getRedirect(): Checking invalid widget type",
                    BWidget.getRedirect, "Nonexistent", "id");

    // test getZones
    assert("getZones(): Checking Page zones",
           [ "top", "content", "bottom" ], BWidget.getZones("Page"),
          arrayEquality);
    assert("getZones(): Checking Header zones",
           [ "left", "right", "bottom" ], BWidget.getZones("Header"),
          arrayEquality);
    assert("getZones(): Checking Button zones",
           [], BWidget.getZones("Button"), arrayEquality);

    expectException("getZones(): Checking invalid widget type",
                    BWidget.getZones, "Nonexistent", "id");

    // test getZoneCardinality
    assert("getZoneCardinality(): Checking Header left zone cardinality",
           "1", BWidget.getZoneCardinality("Header", "left"));
    assert("getZoneCardinality(): Checking Footer default zone cardinality",
           "N", BWidget.getZoneCardinality("Footer", "default"));

    expectException("getZoneCardinality(): Checking invalid widget type",
                    BWidget.getZoneCardinality, "Nonexistent", "id");
    expectException("getZoneCardinality(): Checking invalid Page zone",
                    BWidget.getZoneCardinality, "Page", "nonexistent");

    // test isTypeInList
    assert("isTypeInList(): Checking for string in array",
           true, BWidget.isTypeInList("Button", [ "Header", "Button",
                                                  "Footer" ]));
    assert("isTypeInList(): Checking for string in string",
           true, BWidget.isTypeInList("Button", "Button"));
    assert("isTypeInList(): Checking for string not in array",
           false, BWidget.isTypeInList("Page", [ "Header", "Button",
                                                "Footer" ]));
    assert("isTypeInList(): Checking for string not in string",
           false, BWidget.isTypeInList("Page", "Button"));
    assert("isTypeInList(): Checking for string in undefined",
           false, BWidget.isTypeInList("Page", undefined));

    // test childAllowsParent
    assert("childAllowsParent(): Checking Page in Design",
           true, BWidget.childAllowsParent("Design", "Page"));
    assert("childAllowsParent(): Checking Button in Content",
           true, BWidget.childAllowsParent("Content", "Button"));
    assert("childAllowsParent(): Checking Footer in Header",
           false, BWidget.childAllowsParent("Header", "Footer"));

    // special case: parent allows this but child doesn't
    assert("childAllowsParent(): Checking Header in Content",
           false, BWidget.childAllowsParent("Content", "Header"));

    // special case: child allows this but parent doesn't
    assert("childAllowsParent(): Checking TextInput in Header",
           true, BWidget.childAllowsParent("Header", "TextInput"));

    expectException("childAllowsParent(): Checking invalid parent type",
                    BWidget.childAllowsParent, "Nonexistent", "Page");
    expectException("childAllowsParent(): Checking invalid child type",
                    BWidget.childAllowsParent, "Page", "Nonexistent");

    // test zoneAllowsChild
    assert("zoneAllowsChild(): Checking Page in Design default zone",
           true, BWidget.zoneAllowsChild("Design", "default", "Page"));
    assert("zoneAllowsChild(): Checking Button in Header right zone",
           true, BWidget.zoneAllowsChild("Header", "right", "Button"));
    assert("zoneAllowsChild(): Checking TextInput in Page top zone",
           false, BWidget.zoneAllowsChild("Page", "top", "TextInput"));

    expectException("zoneAllowsChild(): Checking invalid parent type",
                    BWidget.zoneAllowsChild, "Nonexistent", "default", "Page");
    expectException("zoneAllowsChild(): Checking invalid child type",
                    BWidget.zoneAllowsChild, "Page", "top", "Nonexistent");
    expectException("zoneAllowsChild(): Checking invalid zone",
                    BWidget.zoneAllowsChild, "Page", "left", "Button");

    // test parentAllowsChild
    assert("parentAllowsChild(): Checking Header in Page",
           true, BWidget.parentAllowsChild("Page", "Header"));
    assert("parentAllowsChild(): Checking Button in Header",
           true, BWidget.parentAllowsChild("Header", "Button"));
    assert("parentAllowsChild(): Checking Footer in Header",
           false, BWidget.parentAllowsChild("Header", "Footer"));

    // special case: parent allows this but child doesn't
    assert("parentAllowsChild(): Checking Header in Content",
           true, BWidget.parentAllowsChild("Content", "Header"));

    // special case: child allows this but parent doesn't
    assert("parentAllowsChild(): Checking TextInput in Header",
           false, BWidget.parentAllowsChild("Header", "TextInput"));

    expectException("parentAllowsChild(): Checking invalid parent type",
                    BWidget.parentAllowsChild, "Nonexistent", "Page");
    expectException("parentAllowsChild(): Checking invalid child type",
                    BWidget.parentAllowsChild, "Page", "Nonexistent");

    // test zonesForChild
    assert("zonesForChild(): Checking zones for Button in Header",
           [ "left", "right" ], BWidget.zonesForChild("Header", "Button"),
           arrayEquality);
    assert("zonesForChild(): Checking zones for Footer in Page",
           [ "bottom" ], BWidget.zonesForChild("Page", "Footer"),
           arrayEquality);
    assert("zonesForChild(): Checking zones for TextInput in Design",
           [ ], BWidget.zonesForChild("Design", "TextInput"),
           arrayEquality);

    expectException("zonesForChild(): Checking invalid parent type",
                    BWidget.zonesForChild, "Nonexistent", "Page");
    expectException("zonesForChild(): Checking invalid child type",
                    BWidget.zonesForChild, "Page", "Nonexistent");

    // test isSelectable
    assert("isSelectable(): Checking Button",
           true, BWidget.isSelectable("Button"));
    assert("isSelectable(): Checking Design",
           false, BWidget.isSelectable("Design"));

    expectException("isSelectable(): Checking invalid widget type",
                    BWidget.isSelectable, "Nonexistent");

    // test isMoveable
    assert("isMoveable(): Checking Button",
           true, BWidget.isMoveable("Button"));
    assert("isMoveable(): Checking Design",
           false, BWidget.isMoveable("Design"));
    assert("isMoveable(): Checking Header",
           false, BWidget.isMoveable("Header"));

    expectException("isMoveable(): Checking invalid widget type",
                    BWidget.isMoveable, "Nonexistent");

    reportTestResults();
}
