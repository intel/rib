/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
CodeMirror.defineMode("ribsrc", function(config, parserConfig) {

    var htmlMixedMode, regActivePage;

    return {
        startState: function() {
            var activePage = ADM.getActivePage();
            regActivePage =  new RegExp('data-role="page".*id="' + (activePage ? activePage.getProperty('id'):'*') + '"');
            htmlMixedMode = htmlMixedMode || CodeMirror.getMode(config, "htmlmixed");
            return { htmlState : htmlMixedMode.startState() };
        },

        token: function(stream, state) {
            var ret;
            if (stream.match(regActivePage, false))
                state.activePage = true;
            if (state.activePage) {
                if (stream.match('<div', false))
                    state.divs? state.divs ++:state.divs = 1;
                if (stream.match('</div>', false))
                    state.divs --;
                if (state.divs === 0)
                    state.activePage = false;
                ret = htmlMixedMode.token(stream, state.htmlState);
                return ret && ret + ' active';
            }
            else {
                stream.next();
                return "inactive";
            }
        },

        indent: function(state, textAfter) {
            return htmlMixedMode.indent(state.htmlState, textAfter);
        },

        copyState: function(state) {
            return {
                htmlState: CodeMirror.copyState(htmlMixedMode, state.htmlState)
            }
        },


        electricChars: "/{}:"
    }
});

CodeMirror.defineMIME("text/ribsrc", "ribsrc");
