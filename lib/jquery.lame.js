/******************************************

Plugin: 'lame' (List And Menu Expander)

Author: Ryan Ray

Released under the FreeBSD Licence

Copyright 2011 Ryan Ray. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY RYAN RAY ``AS IS'' AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL RYAN RAY OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those of the
authors and should not be interpreted as representing official policies, either expressed
or implied, of Ryan Ray.


*******************************************/

(function($){$.fn.lame=function(options){var settings={speed:'fast',save:false,action:'click',effect:'slide',close:false};return this.each(function(){var menu=$(this);var cookie_name=menu.attr("id");cookie_name=(cookie_name=="")?"menu_state":cookie_name;if(options){$.extend(settings,options);}
var child_menu=$(this).find('ul');var links=$(this).find('li').find('a');if(settings['save']==true){var state=getState(child_menu);initDisplay(child_menu,state);}
switch(settings['action']){case"hover":links.mouseover(function(){var child=$(this).parent().find('ul:first');(settings['effect']=="slide")?child.slideDown(settings['speed']):child.fadeIn(settings['speed']);});if(settings['close']==true){links.parent().mouseleave(function(){var e=$(this).find('ul:first');(settings['effect']=="slide")?e.slideUp(settings['speed']):e.fadeOut(settings['speed']);});}
else{menu.mouseleave(function(){var e=$(this).find('ul');(settings['effect']=="slide")?e.slideUp(settings['speed']):e.fadeOut(settings['speed']);});}
break;case"click":default:links.click(function(){($(this).hasClass("lame_active"))?$(this).removeClass("lame_active"):$(this).addClass("lame_active");var child=$(this).parent().find('ul:first');return menuAnimate(child);});break;}
function menuAnimate(child){if(child.html()!=null){if(settings['effect']=="slide"){child.slideToggle(settings['speed'],function(){if(settings['save']==true){state=setState(child_menu);saveState(state);}});}
else{child.fadeToggle(settings['speed'],function(){if(settings['save']==true){state=setState(child_menu);saveState(state);}});}
return false;}
else{return true;}}
function initDisplay(child,state){child.each(function(index){if(state[index]==1){$(this).parent().find("a:first").addClass("lame_active");$(this).css('display','block');}});}
function getState(child){var state=$.cookie(cookie_name);return(state!=null)?state.split(","):setState(child_menu);}
function setState(child){var state=new Array();child_menu.each(function(index){var display=$(this).css('display');(display=="none")?state[index]=0:state[index]=1;});return state;}
function saveState(state){var save_state=state.join(",");$.cookie(cookie_name,save_state,{path:'/'});}});};})(jQuery);
