/*!
 * JSizes - JQuery plugin v0.33
 *
 * Licensed under the revised BSD License.
 * Copyright 2008-2010 Bram Stein
 * All rights reserved.
 */
/*global jQuery*/
(function ($) {
	var num = function (value) {
			return parseInt(value, 10) || 0;
		};

	/**
	 * Sets or gets the values for min-width, min-height, max-width
	 * and max-height.
	 */
	$.each(['min', 'max'], function (i, name) {
		$.fn[name + 'Size'] = function (value) {
			var width, height;
			if (value) {
				if (value.width !== undefined) {
					this.css(name + '-width', value.width);
				}
				if (value.height !== undefined) {
					this.css(name + '-height', value.height);
				}
				return this;
			}
			else {
				width = this.css(name + '-width');
				height = this.css(name + '-height');
				// Apparently:
				//  * Opera returns -1px instead of none
				//  * IE6 returns undefined instead of none
				return {'width': (name === 'max' && (width === undefined || width === 'none' || num(width) === -1) && Number.MAX_VALUE) || num(width), 
						'height': (name === 'max' && (height === undefined || height === 'none' || num(height) === -1) && Number.MAX_VALUE) || num(height)};
			}
		};
	});

	/**
	 * Returns whether or not an element is visible.
	 */
	$.fn.isVisible = function () {
		return this.is(':visible');
	};

	/**
	 * Sets or gets the values for border, margin and padding.
	 */
	$.each(['border', 'margin', 'padding'], function (i, name) {
		$.fn[name] = function (value) {
			if (value) {
				if (value.top !== undefined) {
					this.css(name + '-top' + (name === 'border' ? '-width' : ''), value.top);
				}
				if (value.bottom !== undefined) {
					this.css(name + '-bottom' + (name === 'border' ? '-width' : ''), value.bottom);
				}
				if (value.left !== undefined) {
					this.css(name + '-left' + (name === 'border' ? '-width' : ''), value.left);
				}
				if (value.right !== undefined) {
					this.css(name + '-right' + (name === 'border' ? '-width' : ''), value.right);
				}
				return this;
			}
			else {
				return {top: num(this.css(name + '-top' + (name === 'border' ? '-width' : ''))),
						bottom: num(this.css(name + '-bottom' + (name === 'border' ? '-width' : ''))),
						left: num(this.css(name + '-left' + (name === 'border' ? '-width' : ''))),
						right: num(this.css(name + '-right' + (name === 'border' ? '-width' : '')))};
			}
		};
	});
})(jQuery);
/*!
 * jLayout Border Layout - JavaScript Layout Algorithms v0.4
 *
 * Licensed under the new BSD License.
 * Copyright 2008-2009, Bram Stein
 * All rights reserved.
 */
/*global jLayout */
(function () {
	jLayout = typeof jLayout === 'undefined' ? {} : jLayout;

	jLayout.border = function (spec) {
		var my = {},
			that = {},
			east = spec.east,
			west = spec.west,
			north = spec.north,
			south = spec.south,
			center = spec.center;

		my.hgap = spec.hgap || 0;
		my.vgap = spec.vgap || 0;

		that.items = function () {
			var items = [];
			if (east) {
				items.push(east);
			}

			if (west) {
				items.push(west);
			}

			if (north) {
				items.push(north);
			}

			if (south) {
				items.push(south);
			}

			if (center) {
				items.push(center);
			}
			return items;
		};		

		that.layout = function (container) {
			var size = container.bounds(),
				insets = container.insets(),
				top = insets.top,
				bottom = size.height - insets.bottom,
				left = insets.left,
				right = size.width - insets.right,
				tmp;

			if (north && north.isVisible()) {
				tmp = north.preferredSize();
				north.bounds({'x': left, 'y': top, 'width': right - left, 'height': tmp.height});
				north.doLayout();

				top += tmp.height + my.vgap;
			}
			if (south && south.isVisible()) {
				tmp = south.preferredSize();
				south.bounds({'x': left, 'y': bottom - tmp.height, 'width': right - left, 'height': tmp.height});
				south.doLayout();

				bottom -= tmp.height + my.vgap;
			}
			if (east && east.isVisible()) {
				tmp = east.preferredSize();
				east.bounds({'x': right - tmp.width, 'y': top, 'width': tmp.width, 'height': bottom - top});
				east.doLayout();

				right -= tmp.width + my.hgap;
			}
			if (west && west.isVisible()) {
				tmp = west.preferredSize();
				west.bounds({'x': left, 'y': top, 'width': tmp.width, 'height': bottom - top});
				west.doLayout();

				left += tmp.width + my.hgap;
			}
			if (center && center.isVisible()) {
				center.bounds({'x': left, 'y': top, 'width': right - left, 'height': bottom - top});
				center.doLayout();
			}
			return container;
		};

		function typeLayout(type) {
			return function (container) {
				var insets = container.insets(),
					width = 0,
					height = 0,
					type_size;

				if (east && east.isVisible()) {
					type_size = east[type + 'Size']();
					width += type_size.width + my.hgap;
					height = type_size.height;
				}
				if (west && west.isVisible()) {
					type_size = west[type + 'Size']();
					width += type_size.width + my.hgap;
					height = Math.max(type_size.height, height);
				}
				if (center && center.isVisible()) {
					type_size = center[type + 'Size']();
					width += type_size.width;
					height = Math.max(type_size.height, height);
				}
				if (north && north.isVisible()) {
					type_size = north[type + 'Size']();
					width = Math.max(type_size.width, width);
					height += type_size.height + my.vgap;
				}
				if (south && south.isVisible()) {
					type_size = south[type + 'Size']();
					width = Math.max(type_size.width, width);
					height += type_size.height + my.vgap;
				}

				return {
					'width': width + insets.left + insets.right, 
					'height': height + insets.top + insets.bottom
				};
			};
		}
		that.preferred = typeLayout('preferred');
		that.minimum = typeLayout('minimum');
		that.maximum = typeLayout('maximum');
		return that;
	};
})();
/*!
 * jLayout Grid Layout - JavaScript Layout Algorithms v0.41
 *
 * Licensed under the new BSD License.
 * Copyright 2008-2009, Bram Stein
 * All rights reserved.
 */
/*global jLayout */
(function () {
	jLayout = typeof jLayout === 'undefined' ? {} : jLayout;

	jLayout.grid = function (spec, shared) {
		var my = shared || {},
			that = {};

		my.hgap = spec.hgap || 0;
		my.vgap = spec.vgap || 0;

		// initialize the number of columns to the number of items
		// we're laying out.
		my.items = spec.items || [];
		my.columns = spec.columns || my.items.length;
		my.rows = spec.rows || 0;
		my.fillVertical = spec.fill && spec.fill === 'vertical';

		if (my.rows > 0) {
			my.columns = Math.floor((my.items.length + my.rows - 1) / my.rows); 
		} else {
			my.rows = Math.floor((my.items.length + my.columns - 1) / my.columns);
		}
	
		that.items = function () {
			var r = [];
			Array.prototype.push.apply(r, my.items);
			return r;
		};

		that.layout = function (container) {
			var i, j,
				insets = container.insets(),
				x = insets.left,
				y = insets.top,
				width = (container.bounds().width - (insets.left + insets.right) - (my.columns - 1) * my.hgap) / my.columns,
				height = (container.bounds().height - (insets.top + insets.bottom) - (my.rows - 1) * my.vgap) / my.rows;

			for (i = 0, j = 1; i < my.items.length; i += 1, j += 1) {
				my.items[i].bounds({'x': x, 'y': y, 'width': width, 'height': height});

				if (!my.fillVertical) {
					if (j >= my.columns) {
						y += height + my.vgap;
						x = insets.left;
						j = 0;
					}
					else {
						x += width + my.hgap;
					}
				} else {
					if (j >= my.rows) {
						x += width + my.hgap;
						y = insets.top;
						j = 0;
					} else {
						y += height + my.vgap;
					}
				}
				my.items[i].doLayout();
			}
			return container;
		};

		function typeLayout(type) {
			return function (container) {
				var i = 0, 
					width = 0, 
					height = 0, 
					type_size,
					insets = container.insets();

				for (; i < my.items.length; i += 1) {
					type_size = my.items[i][type + 'Size']();
					width = Math.max(width, type_size.width);
					height = Math.max(height, type_size.height);
				}
				return {
					'width': insets.left + insets.right + my.columns * width + (my.columns - 1) * my.hgap, 
					'height': insets.top + insets.bottom + my.rows * height + (my.rows - 1) * my.vgap
				};
			};
		}

		// this creates the min and preferred size methods, as they
		// only differ in the function they call.
		that.preferred = typeLayout('preferred');
		that.minimum = typeLayout('minimum');
		that.maximum = typeLayout('maximum');
		return that;
	};
})();

/*!
 * jLayout Flex Grid Layout - JavaScript Layout Algorithms v0.4
 * Based on: http://www.javaworld.com/javaworld/javatips/jw-javatip121.html
 *
 * Licensed under the new BSD License.
 * Copyright 2008-2009, Bram Stein
 * All rights reserved.
 */
/*global jLayout */
(function () {
	jLayout = typeof jLayout === 'undefined' ? {} : jLayout;

	// The flex grid has a dependency on the grid layout, so please make
	// sure you include the grid layout manager before the flex grid
	// layout manager.
	if (typeof jLayout.grid !== 'undefined') {
		jLayout.flexGrid = function (spec) {
			var my = {},
				that = this.grid(spec, my);

			function zeroArray(a, l) {
				var i = 0;
				for (; i < l; i += 1) {
					a[i] = 0;
				}
				return a;
			}

			function typeLayout(type) {
				return function (container) {
					var i = 0, r = 0, c = 0, nw = 0, nh = 0,
						w = zeroArray([], my.columns),
						h = zeroArray([], my.rows),
						type_size,
						insets = container.insets();
			
					for (i = 0; i < my.items.length; i += 1) {
						r = i / my.columns;
						c = i % my.columns;
						type_size = my.items[i][type + 'Size']();
						if (w[c] < type_size.width) {
							w[c] = type_size.width;
						}
						if (h[r] < type_size.height) {
							h[r] = type_size.height;
						}
					}
					for (i = 0; i < my.columns; i += 1) {
						nw += w[i];
					}
					for (i = 0; i < my.rows; i += 1) {
						nh += h[i];
					}
					return {
						width: insets.left + insets.right + nw + (my.columns - 1) * my.hgap,
						height: insets.top + insets.bottom + nh + (my.rows - 1) * my.vgap
					};
				};
			}

			that.preferred = typeLayout('preferred');
			that.minimum = typeLayout('minimum');
			that.maximum = typeLayout('maximum');

			that.layout = function (container) {
				var i = 0, c = 0, r = 0,
					pd = that.preferred(container),
					sw = container.bounds().width / pd.width,
					sh = container.bounds().height / pd.height,
					w = zeroArray([], my.columns),
					h = zeroArray([], my.rows),
					insets = container.insets(),
					x = insets.left,
					y = insets.top,
					d;

				for (i = 0; i < my.items.length; i += 1) {
					r = i / my.columns;
					c = i % my.columns;
					d = my.items[i].preferredSize();
					d.width = sw * d.width;
					d.height = sh * d.height;

					if (w[c] < d.width) {
						w[c] = d.width;
					}
					if (h[r] < d.height) {
						h[r] = d.height;
					}
				}

				for (c = 0; c < my.columns; c += 1) {
					for (r = 0, y = insets.top; r < my.rows; r += 1) {
						i = r * my.columns + c;
						if (i < my.items.length) {
							my.items[i].bounds({'x': x, 'y': y, 'width': w[c], 'height': h[r]});
							my.items[i].doLayout();
						}
						y += h[r] + my.vgap;
					}
					x += w[c] + my.hgap;
				}

				return container;
			};
			return that;
		};
	}
})();
/*!
 * jLayout Flow Layout - JavaScript Layout Algorithms v0.12
 *
 * Licensed under the new BSD License.
 * Copyright 2008-2009, Bram Stein
 * All rights reserved.
 */
/*global jLayout */
(function () {
	jLayout = typeof jLayout === 'undefined' ? {} : jLayout;

	jLayout.flow = function (options) {
		var my = {},
			that = {};

		
		my.hgap = typeof options.hgap === 'number' && !isNaN(options.hgap) ? options.hgap : 5;
		my.vgap = typeof options.vgap === 'number' && !isNaN(options.vgap) ? options.vgap : 5;
		my.items = options.items || [];
		my.alignment = (options.alignment && (options.alignment === 'center' || options.alignment === 'right' || options.alignment === 'left') && options.alignment) || 'left';		

		that.items = function () {
			var r = [];
			Array.prototype.push.apply(r, my.items);
			return r;
		};

		that.layout = function (container) {
			var parentSize = container.bounds(),
				insets = container.insets(),
				i = 0,
				len = my.items.length,
				itemSize,
				currentRow = [],
				rowSize = {
					width: 0,
					height: 0
				},
				offset = {
					x: insets.left,
					y: insets.top
				};

			parentSize.width -= insets.left + insets.right;
			parentSize.height -= insets.top + insets.bottom;

			for (; i < len; i += 1) {
				if (my.items[i].isVisible()) {
					itemSize = my.items[i].preferredSize();
					
					if ((rowSize.width + itemSize.width) > parentSize.width) {
						align(currentRow, offset, rowSize, parentSize);

						currentRow = [];
						offset.y += rowSize.height;
						offset.x = insets.left;
						rowSize.width = 0;
						rowSize.height = 0;
					}
					rowSize.height = Math.max(rowSize.height, itemSize.height + my.vgap);
					rowSize.width += itemSize.width + my.hgap;

					currentRow.push(my.items[i]);
				}
			}
			align(currentRow, offset, rowSize, parentSize);
			return container;
		};

		function align(row, offset, rowSize, parentSize) {
			var location = {
					x: offset.x,
					y: offset.y
				},
				i = 0,
				len = row.length;

			switch (my.alignment) {
				case 'center': {
					location.x += (my.hgap + parentSize.width - rowSize.width) / 2;
					break;
				}
				case 'right': {
					location.x += parentSize.width - rowSize.width + my.hgap;
					break;
				}
			}

			for (; i < len; i += 1) {
				location.y = offset.y;
				row[i].bounds(location);
				row[i].doLayout();
				location.x += row[i].bounds().width + my.hgap;
			}
		}

		function typeLayout(type) {
			return function (container) {
				var i = 0, 
					width = 0, 
					height = 0, 
					typeSize,
					firstComponent = false,
					insets = container.insets();

				for (; i < my.items.length; i += 1) {
					if (my.items[i].isVisible()) {
						typeSize = my.items[i][type + 'Size']();
						height = Math.max(height, typeSize.height);
						width += typeSize.width;
					}
				}

				return {
					'width': width + insets.left + insets.right + (my.items.length - 1) * my.hgap,
					'height': height + insets.top + insets.bottom
				};
			};
		}

		that.preferred = typeLayout('preferred');
		that.minimum = typeLayout('minimum');
		that.maximum = typeLayout('maximum');		

		return that;
	};
})();

/*!
 * jLayout JQuery Plugin v0.17
 *
 * Licensed under the new BSD License.
 * Copyright 2008-2009 Bram Stein
 * All rights reserved.
 */
/*global jQuery jLayout*/
if (jQuery && jLayout) {
	(function ($) {
		/**
		 * This wraps jQuery objects in another object that supplies
		 * the methods required for the layout algorithms.
		 */
		function wrap(item, resize) {
			var that = {};

			$.each(['min', 'max'], function (i, name) {
				that[name + 'imumSize'] = function (value) {
                    var l = item.data('jlayout');
                    
					if (l) {
						return l[name + 'imum'](that);
					} else {
						return item[name + 'Size'](value);
					}
				};
			});

			$.extend(that, {
				doLayout: function () {
                    var l = item.data('jlayout');
                    
					if (l) {
                        l.layout(that);
					}
					item.css({position: 'absolute'});
				},
				isVisible: function () {
					return item.isVisible();
				},
				insets: function () {
					var p = item.padding(),
						b = item.border();

					return {
                        'top': p.top, 
						'bottom': p.bottom + b.bottom + b.top, 
						'left': p.left, 
						'right': p.right + b.right + b.left
                    };
				},
				bounds: function (value) {
					var tmp = {};

					if (value) {
						if (typeof value.x === 'number') {
							tmp.left = value.x;
						}
						if (typeof value.y === 'number') {
							tmp.top = value.y;
						}
						if (typeof value.width === 'number') {
							tmp.width = (value.width - (item.outerWidth(true) - item.width()));
							tmp.width = (tmp.width >= 0) ? tmp.width : 0;
						}
						if (typeof value.height === 'number') {
							tmp.height = value.height - (item.outerHeight(true) - item.height());
							tmp.height = (tmp.height >= 0) ? tmp.height : 0;
						}
						item.css(tmp);
						return item;
					} else {
						tmp = item.position();
						return {
                          	'x': tmp.left,
                        	'y': tmp.top,
							'width': item.outerWidth(false),
							'height': item.outerHeight(false)
                        };
					}
				},
				preferredSize: function () {
					var minSize,
						maxSize,
						margin = item.margin(),
						size = {width: 0, height: 0},
                        l = item.data('jlayout');

					if (l && resize) {
						size = l.preferred(that);

						minSize = that.minimumSize();
						maxSize = that.maximumSize();

						size.width += margin.left + margin.right;
						size.height += margin.top + margin.bottom;

						if (size.width < minSize.width || size.height < minSize.height) {
							size.width = Math.max(size.width, minSize.width);
							size.height = Math.max(size.height, minSize.height);
						} else if (size.width > maxSize.width || size.height > maxSize.height) {
							size.width = Math.min(size.width, maxSize.width);
							size.height = Math.min(size.height, maxSize.height);
						}
					} else {
                        size = that.bounds();
						size.width += margin.left + margin.right;
						size.height += margin.top + margin.bottom;
					}
					return size;
				}
			});
			return that;
		}

		$.fn.layout = function (options) {
			var opts = $.extend({}, $.fn.layout.defaults, options);
			return $.each(this, function () {
				var element = $(this),
					o = $.metadata && element.metadata().layout ? $.extend(opts, element.metadata().layout) : opts,
					elementWrapper = wrap(element, o.resize);

				if (o.type === 'border' && typeof jLayout.border !== 'undefined') {                
					$.each(['north', 'south', 'west', 'east', 'center'], function (i, name) {
						if (element.children().hasClass(name)) {
							o[name] = wrap(element.children('.' + name + ':first'));
						}
					});
					element.data('jlayout', jLayout.border(o));
				} else if (o.type === 'grid' && typeof jLayout.grid !== 'undefined') {
					o.items = [];
					element.children().each(function (i) {
						if (!$(this).hasClass('ui-resizable-handle')) {
							o.items[i] = wrap($(this));
						}
					});
					element.data('jlayout', jLayout.grid(o));
				} else if (o.type === 'flexGrid' && typeof jLayout.flexGrid !== 'undefined') {
					o.items = [];
					element.children().each(function (i) {
						if (!$(this).hasClass('ui-resizable-handle')) {
							o.items[i] = wrap($(this));
						}
					});
					element.data('jlayout', jLayout.flexGrid(o));
				} else if (o.type === 'column' && typeof jLayout.column !== 'undefined') {
					o.items = [];
					element.children().each(function (i) {
						if (!$(this).hasClass('ui-resizable-handle')) {
							o.items[i] = wrap($(this));
						}
					});
					element.data('jlayout', jLayout.column(o));
				} else if (o.type === 'flow' && typeof jLayout.flow !== 'undefined') {
					o.items = [];
					element.children().each(function (i) {
						if (!$(this).hasClass('ui-resizable-handle')) {
							o.items[i] = wrap($(this));
						}
					});
					element.data('jlayout', jLayout.flow(o));					
				}
                
				if (o.resize) {
					elementWrapper.bounds(elementWrapper.preferredSize());
				}
                
				elementWrapper.doLayout();
				element.css({position: 'relative'});
				if ($.ui !== undefined) {
					element.addClass('ui-widget');
				}
			});
		};

		$.fn.layout.defaults = {
			resize: true,
			type: 'grid'
		};
	})(jQuery);
}
