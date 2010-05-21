(function($) {

	/**
	 * Name: bgNestedSortable
	 * Author: Henrik Almér for AGoodId
	 *
	 * This plugin controls expand/collapse and drag/drop of nested structures
	 * presented in table form.
	 *
	 * Dependencies: jQuery, jQueryUI Core, jQuery UI Draggable, jQuery UI Droppable
	 *
	 * @param settings: JavaScript object of settings
	 */

	$.fn.bgNestedSortable = function(settings) {
		var config = {
			'expandCollapse':	true,
			'dragAndDrop':		true,
			'initHidden':			true,
			'dataClass':			'nested-data',
			'parentClass':		'has-children'
		};
		
		if (settings) $.extend(config, settings);
		
		this.each(function() {
			var self = this;

			$(self).data('config', config);

			var draggableConfig = {
				appendTo:	'body',
				revert:		'invalid',
				drag:			function(e, ui) {
										hideDropIndicator(self);

										var targetRow = $(self).find('.ui-droppable-hover');
										var offset;
										var height;

										if (targetRow.length > 0) {
											offset = targetRow.offset();
											height = targetRow.height();
										} else {
											offset = {top: 0, left: 0};
											height = 0;
										}
										
										var dropAction = getDropAction(e.pageY, offset.top, height);
										
										if (dropAction && $(self).data('dropAction') && $(self).data('dropAction') != dropAction) {
											$('#debug-area').html(dropAction).effect("highlight", {color: '#0ff'}, 1000);
										}
										
										showDropIndicator(dropAction, targetRow);

										$(self).data('dropAction', dropAction);
										$(self).data('dropTarget', targetRow);
									},
				helper:		function(e, ui) {
										var helper = $('<div class="nested-table-item-dragging"><table></table></div>')
											.find('table').append($(e.target).closest('tr').clone());

										return getFamily(self, helper, $(e.target).closest('tr')).end();
									}
			};

			var droppableConfig = {
				tolerance:		'pointer',
				activeClass:	'ui-droppable-active',
				hoverClass:		'ui-droppable-hover',
				drop:					function(e, ui) {												
												switch($(self).data('dropAction')) {
													case 'append':
														setParentClass(self, ui.draggable);

														removeFamily(self, ui.draggable);
														ui.draggable.remove();

														appendFamily(self, ui.helper, this);
														break;

													case 'insertBefore':
														removeFamily(self, ui.draggable);
														ui.draggable.remove();
													
														insertFamilyBefore(self, ui.helper);
														break;

													case 'insertAfter':
														removeFamily(self, ui.draggable);
														ui.draggable.remove();
													
														insertFamilyAfter(self, ui.helper);
														break;

													default:
														break;
												}
												
												ui.helper.remove();
												hideDropIndicator(self);
											}
			};
			
			$(self).find('tr').draggable(draggableConfig).droppable(droppableConfig)
				.data('init', true);
			
			// If a hovered item i not initiated as a draggable/droppable, 
			// initiate it (for live items)
			$(self).find('tr').live('mouseover', function() {
				if (!$(this).data('init')) {
					$(this).data('init', true);
					$(this).draggable(draggableConfig).droppable(droppableConfig);
				}
			});

			// Hide (or show) all children
			if (config.initHidden) {
				$(self).find("tr[class*='child-of-']").hide();
				$(self).find("tr[class*='" + config.parentClass + "']").addClass('collapsed');
			} else {
				$(self).find("tr[class*='" + config.parentClass + "']").addClass('expanded');
			}
		
			// Prepend expand/collapse-links to all rows that have children
			$(self).find('tr.' + config.parentClass + ' td.' + config.dataClass)
				.prepend('<a href="" class="expand-collapse"></a>');
			
			// Assign click handlers to expand/collapse-links
			$(self).find('a.expand-collapse').live('click', function(e) {
				$(this).closest('tr').toggleClass('collapsed').toggleClass('expanded');
				toggleChildren(self, $(this).closest('tr'));

				e.preventDefault();
			});
		});
		
		return this;
	};
	
	/**
	 * Private function toggleChildren. Runs recursively to toggle all children and 
	 * grand-children when an expand/collapse-link is clicked.
	 *
	 * @param container: containing element used to control the scope of the function.
	 * @param parent: the parent element
	 */

	function toggleChildren(container, parent) {
		var parentId = parent.attr('id');
		var expandedChildren = $(container).find('.child-of-' + parentId + '.expanded');

		$(container).find('.child-of-' + parentId).each(function() {
			$(this).toggle();
		});
		
		if ( expandedChildren.length > 0 ) {
			expandedChildren.each(function() {
				toggleChildren(container, $(this));
			});
		}
	};
	
	/**
	 * Private function getFamily. Recursively fetches all children and grand-children
	 * of the selected element and returns them as a jQuery-object.
	 *
	 * @param container: the containing element.
	 * @param draggable: the draggable jQuery object that the family is appended to
	 * @param parent: the parent item to use as starting point when looking for descendants
	 */
	
	function getFamily(container, helper, parent) {
		var config = $(container).data('config');

		$(container).find('.child-of-' + parent.attr('id')).each(function() {
			helper.append($(this).clone());
			
			if ($(this).hasClass(config.parentClass)) {
				getFamily(container, helper, $(this));
			}
		});
		
		return helper;
	}
	
	/**
	 * Private function appendFamily. Appends the dropped family at the right place
	 * in the table.
	 *
	 * @param container: the containing element
	 * @param family: the draggable helper object
	 * @param target: the droppable target row
	 */
	
	function appendFamily(container, family, target) {
		var config = $(container).data('config');

		var targetLevel = getLevel($(target).attr('class'));
		var firstChildLevel = getLevel(family.find('table tbody')
			.find('tr:first-child').attr('class'));
		
		// Set parent for top-level children
		family.find('table tbody tr.level' + firstChildLevel).each(function() {
			setParent(target, this);
		});
		// Set level for all children
		family.find('table tbody').children().each(function() {
			setLevel(targetLevel, firstChildLevel, this);
		});
		
		$(target).addClass(config.parentClass + ' expanded').find('td.' + config.dataClass)
		if ( $(target).find('td.' + config.dataClass + ' a.expand-collapse').length <= 0 ) {
			$(target).find('td.' + config.dataClass).prepend('<a href="" class="expand-collapse"></a>');
		}

		family.find('table tbody').children().insertAfter($(target));
	}
	
	/**
	 * Private function insertFamilyBefore.
	 *
	 * @param container: the containing element
	 * @param family: the draggable helper object
	 */

	function insertFamilyBefore(container, family) {
		var config = $(container).data('config');
		var target = $(container).data('dropTarget');
		var targetParent = getParent(container, target);

		if (false == targetParent) {
			//
		} else {
			var targetLevel = getLevel($(targetParent).attr('class'));
			var firstChildLevel = getLevel(family.find('table tbody')
				.find('tr:first-child').attr('class'));
			
			// Set parent for top-level children
			family.find('table tbody tr.level' + firstChildLevel).each(function() {
				setParent(targetParent, this);
			});

			// Set level for all children
			family.find('table tbody').children().each(function() {
				setLevel(targetLevel, firstChildLevel, this);
			});
		
			$(targetParent).addClass(config.parentClass + ' expanded').find('td.' + config.dataClass)
			if ( $(targetParent).find('td.' + config.dataClass + ' a.expand-collapse').length <= 0 ) {
				$(targetParent).find('td.' + config.dataClass).prepend('<a href="" class="expand-collapse"></a>');
			}
		}

		family.find('table tbody').children().insertBefore($(target));
	}
	
	/**
	 * Private function insertFamilyAfter.
	 *
	 * @param container: the containing element
	 * @param family: the draggable helper object
	 */

	function insertFamilyAfter(container, family) {
		var config = $(container).data('config');
		var target = $(container).data('dropTarget');
		var targetParent = getParent(container, target);

		var targetLevel = getLevel($(targetParent).attr('class'));
		var firstChildLevel = getLevel(family.find('table tbody')
			.find('tr:first-child').attr('class'));

		// Set parent for top-level children
		family.find('table tbody tr.level' + firstChildLevel).each(function() {
			setParent(targetParent, this);
		});

		// Set level for all children
		family.find('table tbody').children().each(function() {
			setLevel(targetLevel, firstChildLevel, this);
		});
		
		$(targetParent).addClass(config.parentClass + ' expanded').find('td.' + config.dataClass)
		if ( $(targetParent).find('td.' + config.dataClass + ' a.expand-collapse').length <= 0 ) {
			$(targetParent).find('td.' + config.dataClass).prepend('<a href="" class="expand-collapse"></a>');
		}

		family.find('table tbody').children().insertAfter($(target));
	}
	
	/**
	 * Private function removeFamily. Removes the original table rows of after they
	 * have been dropped and appended at a different place in the table.
	 *
	 * @param container: the containing element
	 * @param parent: the parent row
	 */
	
	function removeFamily(container, parent) {
		var config = $(container).data('config');

		$(container).find('.child-of-' + parent.attr('id')).each(function() {			
			if ($(this).hasClass(config.parentClass)) {
				removeFamily(container, $(this));
			}
			
			$(this).remove();
		});
	}
	
	/**
	 * Private function getLevel. Searches a class string for "level##" and returns
	 * an integer.
	 *
	 * @param class: string
	 */
	
	function getLevel(class) {
		var startPos = class.indexOf('level') + 5;
		var endPos = class.indexOf(' ', startPos);

		return ( endPos != -1 ) ? parseInt( class.substring(startPos, endPos) )
														: parseInt( class.substring(startPos) );
	}
	
	/**
	 * Private function setLevel. Sets the level of a dropped element.
	 *
	 * @param rootLevel: base level
	 * @param firstChildLevel: level of the first child
	 * @param child: jQuery element
	 */
	
	function setLevel(rootLevel, firstChildLevel, child) {
		var curLevel = getLevel($(child).attr('class'));
		var newLevel = rootLevel + 1 + (curLevel - firstChildLevel);
		
		$(child).removeClass('level' + curLevel);
		$(child).addClass('level' + newLevel);
	}
	
	/**
	 * Private function setParent. Assigns a row the correct parent row
	 * by class name
	 *
	 * @param container: the containing element
	 * @param child: child object
	 */
	
	function getParent(container, child) {
		var parentClass = getParentClass(child);
		var parentId = parentClass.substring(9);

		return (false == parentClass) ? false : $(container).find('#' + parentId);
	}
	
	/**
	 * Private function setParent. Assigns a row the correct parent row
	 * by class name
	 *
	 * @param parent: parent object
	 * @param child: child object
	 */
	
	function setParent(parent, child) {
		var curClass = getParentClass(child);

		$(child).removeClass(curClass);
		$(child).addClass('child-of-' + $(parent).attr('id'));
	}
	
	/**
	 * Private function getParentClass.
	 *
	 * @param child: child object
	 */
	
	function getParentClass(child) {
		var class = $(child).attr('class');
		var startPos = class.indexOf('child-of-');
		var endPos = class.indexOf(' ', startPos);

		if (-1 == startPos) {
			return false;
		}

		return (-1 != endPos) ? class.substring(startPos, endPos)
													: class.substring(startPos);
	}
	
	/**
	 * Private function setParentClass. When a row has been dropped, we need
	 * to determine wether it's parent row (if there is one) has other children
	 * or if the parentClass should be removed.
	 *
	 * @param container: the containing element
	 * @param child: the row that has been dropped
	 */
	
	function setParentClass(container, child) {
		var config = $(container).data('config');

		var class = $(child).attr('class');
		var startPos = class.indexOf('child-of-') + 9;
		var endPos = class.indexOf(' ', startPos);
		var parentId = ( endPos != -1 ) ? class.substring(startPos, endPos)
																		: class.substring(startPos);

		if ( $(container).find('.child-of-' + parentId).length < 2 ) {
			$(container).find('#' + parentId).removeClass(config.parentClass + ' expanded collapsed')
				.find('a.expand-collapse').remove();
		}
	}
	
	/**
	 * Private function getDropAction. Determines what drop action to take by
	 * determining mouse position compared to the droppable row
	 *
	 * @param mouseY: mouse y-position
	 * @param targetY: target rows top left corner y-coord
	 * @param height: target rows height
	 */
	
	function getDropAction(mouseY, targetY, height) {
		var droppableRange = {top: targetY, bottom: targetY + height};
		var topRange = {top: targetY, bottom: targetY + (height * 0.2)};
		var bottomRange = {top: targetY + height - (height * 0.2), bottom: targetY + height};
										
		var dropAction;
		dropAction = ( mouseY > droppableRange.top && mouseY < droppableRange.bottom )	? 'append'				: dropAction;
		dropAction = ( mouseY > topRange.top && mouseY < topRange.bottom )							? 'insertBefore'	: dropAction;
		dropAction = ( mouseY > bottomRange.top && mouseY < bottomRange.bottom )				? 'insertAfter'		: dropAction;
		
		return dropAction;
	}
	
	/**
	 * Private function showDropIndicator.
	 *
	 * @param dropAction: the action to be taken on drop
	 * @param target: the target droppable
	 */

	function showDropIndicator(dropAction, target) {
		target.removeClass('bg-nested-table-droppable-append-hover');
		target.siblings().removeClass('bg-nested-table-droppable-hover');
	
		switch(dropAction) {
			case 'append':
				target.addClass('bg-nested-table-droppable-append-hover');
				break;

			case 'insertBefore':
				showDropIndicatorBar(dropAction, target);
				break;

			case 'insertAfter':
				showDropIndicatorBar(dropAction, target);
				break;

			default:
				break;
		}
	}
	
	/**
	 * Private function showDropIndicatorBar.
	 *
	 * @param dropAction: the action to be taken on drop
	 * @param target: the target droppable
	 */
	
	function showDropIndicatorBar(dropAction, target) {
		var maxW = parseInt(target.parent('tbody').find('tr:first-child td.nested-data').width());
		var delta = parseInt(maxW - target.find('td.nested-data').width());
		
		var offset = target.find('td.nested-data').offset();
		var top = ('insertBefore' == dropAction) ? parseInt(offset.top) : parseInt(offset.top + target.find('td.nested-data').height());
		var left = parseInt(offset.left + delta);
		
		var w = parseInt(target.width() - delta);

		$('body').append('<div class="drop-indicator-bar" style="background-color: #0ff; height: 1px; width: '
												+ w + 'px; position: absolute; top: '
												+ top + 'px; left: '
												+ left + 'px;"></div>');
	}
	
	/**
	 * Private function hideDropIndicator.
	 *
	 * @param container: the containing element
	 */
	
	function hideDropIndicator(container) {
		$(container).find('tr').removeClass('bg-nested-table-droppable-append-hover');
		$('.drop-indicator-bar').remove();
			//.removeClass('bg-nested-table-droppable-before-hover')
			//.removeClass('bg-nested-table-droppable-after-hover');
	}
})(jQuery);