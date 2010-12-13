(function($) {

  /**
   * Name: bgNestedSortable
   * Author: Henrik Almér for AGoodId
   * Version: Alpha 2
   * Size: 19 KB (minified 10 KB)
   *
   * This plugin controls expand/collapse and drag/drop of nested structures presented
   * in table form.
   *
   * Dependencies: jQuery, jQueryUI Core, jQuery UI Draggable, jQuery UI Droppable
   *
   * @param settings: JavaScript object of settings
   *
   * TODO: Make it possible to configure child HTML
   * TODO: Make sure the drop indicator accurately reflects the drop
   * TODO: Create prettier dialog boxes on faulty drops, maybe with ui.dialog?
   */

  $.fn.bgNestedSortable = function(settings) {
    var config = {
      'tolerance'             : 1,
      'interval'              : 30,
      'expandCollapse'        : true,
      'dragAndDrop'           : true,
      'edit'                  : true,
      'initHidden'            : true,
      'dataName'              : 'data',
      'dataClass'             : 'nested-data',
      'dataCellClass'         : 'nested-data-cell',
      'iconClass'             : 'nested-data-icon',
      'parentClass'           : 'has-children',
      'addClass'              : 'add-child',
      'blurCallback'          : false,
      'addChildCallback'      : false,
      'deleteCallback'        : false,
      'appendCallback'        : false,
      'insertBeforeCallback'  : false,
      'insertAfterCallback'   : false
    };
    
    if (settings) $.extend(config, settings);
    
    // Initiate each matched container
    this.each(function() {
      var self = this;

      $(self).data('config', config);

      // Instance globals
      var lastRun = 0;
      var lastMousePos = { x: 0, y: 0 };
      var dropAction = false;
      var dropTarget = false;

      // jQuery draggable configuration
      var draggableConfig = {
        appendTo: 'body',
        revert:   'invalid',
        revertDuration:   0,
        drag:     function(e, ui) {

                    /**
                     * Whenever an element is dragged we need to determine what action
                     * to take once the dragging stops. We need to know this action in
                     * the drag event in order to be able to show a correctly positioned
                     * drop indicator.
                     */

                    // Check for throttling
                    var thisRun = new Date().getTime();
                    if(config.interval > thisRun - lastRun )
                      return;
                    
                    lastRun = thisRun;
                    
                    // Check if mouse position has changed
                    var thisMousePos = { x: e.pageX, y: e.pageY };
                    if ( lastMousePos.x == thisMousePos.x && lastMousePos.y == thisMousePos.y )
                      return;
                    
                    lastMousePos = thisMousePos;

                    var targetRow = $(self).find('.ui-droppable-hover');
                    var distance = 0;
                    var offset;
                    var height;

                    if (0 < targetRow.length) {
                      var distance = getDistance(e.pageX, e.pageY, targetRow);
                    
                      offset = targetRow.offset();
                      height = targetRow.height();
                      
                      var curDropAction = (null == offset) ? false : getDropAction(e.pageY, offset.top, height);
                      
                      /**
                       * Check if a drop action was found and if so update the stored
                       * drop action.
                       */
                      
                      if (curDropAction) {
                        hideDropIndicator(self);
                        showDropIndicator(self, dropAction, targetRow);

                        dropAction =  curDropAction;
                        dropTarget = targetRow;
                      }
                    } else if (dropTarget) {
                      var distance = getDistance(e.pageX, e.pageY, dropTarget);
                    }
                    
                    /**
                     * Unset the drop action and drop target if the distance from
                     * cursor to element edge is greater than the specified tolerance.
                     */
                    
                    if (parseInt(config.tolerance) < parseInt(distance)) {
                      hideDropIndicator(self);

                      dropAction = false;
                      dropTarget = false;
                    }
                  },
        stop:     function(e, ui) {

                    /**
                     * Because draggables can be dropped between elements, the droppable
                     * drop event does not always fire. Therefor we need to move the 
                     * actions that would normally belong to a droppable drop event to
                     * the draggable stop event. What we do here is check if a drop 
                     * action is set, and if so execute the function corresponding to 
                     * that action.
                     *
                     * ui.helper is the clone (visible while dragging).
                     * e.target is the original draggable element.
                     * dropTarget is the target that we should append to.
                     */

                    if (validateDrop(ui.helper, dropTarget)) {
                      switch(dropAction) {
                        case 'append':
                          setParentClass(self, ui.helper);
                          removeFamily(self, $(e.target));
                          $(e.target).remove();

                          appendFamily(self, ui.helper, dropTarget);
                          break;

                        case 'insertBefore':
                          removeFamily(self, $(e.target));
                          $(e.target).remove();
                          
                          insertFamilyBefore(self, ui.helper, dropTarget);
                          break;

                        case 'insertAfter':
                          removeFamily(self, $(e.target));
                          $(e.target).remove();
                          
                          insertFamilyAfter(self, ui.helper, dropTarget);
                          break;

                        default:
                          break;
                      }
                    } else {
                      // Error message on faulty drop
                      alert("You can't drop there");
                    }
                    
                    hideDropIndicator(self);
                  },
        helper:   function(e, ui) {

                    /**
                     * This helper takes a dragged row and clones it to a new 
                     * table in a div. This is needed to be able to show the 
                     * dragged element on screen.
                     */

                    var helper = 
                      $('<div class="nested-table-item-dragging"><table class="nested-sortable"></table></div>')
                      .find('table').append($(e.target).closest('tr').clone());

                    return getFamily(self, helper, $(e.target).closest('tr')).end();
                  }
      };

      var droppableConfig = {
        tolerance:    'pointer',
        activeClass:  'ui-droppable-active',
        hoverClass:   'ui-droppable-hover',
        drop:         function() {}
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

      // Hide (or show) all children on init
      var initClass;
      if (config.initHidden) {
        $(self).find("tr[class*='child-of-']").hide();
        initClass= 'collapsed';
      } else {
        initClass = 'expanded';
      }
      
      $(self).find("tr[class*='" + config.parentClass + "']").addClass(initClass);
      
      // Assign click handlers to expand/collapse-links
      $(self)
        .find('tr.' + config.parentClass + ' td.' + config.dataCellClass + ' .' + config.iconClass)
        .live('click', function(e) {
          $(this).closest('td.' + config.dataCellClass)
                  .toggleClass('collapsed')
                  .toggleClass('expanded');

          $(this).closest('tr')
                  .toggleClass('collapsed')
                  .toggleClass('expanded');

          toggleChildren(self, $(this).closest('tr'));

          e.preventDefault();
      });
      
      // The following should only be done if config.edit is true
      if (true === config.edit) {

        /**
         * Toogle hover class for table rows. This is used to indicate
         * that a item is hovered, and also to toggle visibility of
         * the add/edit buttons (controlled by CSS)
         */

        $(self).find('tr').live('mouseover', function(e) {
          $(this).addClass('hover');
        });
        $(self).find('tr').live('mouseout', function(e) {
          $(this).removeClass('hover');
        });
        
        /**
         * Add active class to table rows and make the data inline-
         * editable on click.
         */

        $(self).find('tr td.' + config.dataCellClass + ' .' + config.dataClass)
          .live('click', function(e) {
            // Make sure that an input field is not already added
            if (0 >= $(this).find('input').length) {
              // Assign active class to parent row
              $(this).closest('tr').addClass('active');
            
              var inputId = $(this).closest('td.' + config.dataClass).attr('id');
              var data = $(this).html();
              var input = '<input type="text" id="'
                          + inputId + '-'
                          + config.dataName + '" name="'
                          + config.dataName + '" value="'
                          + data + '" />';
              $(this).html(input);

              $(this).find('input').focus();
            }
        });
        
        /**
         * Remove active class from table rows and replace input fields
         * with text on blur
         */
        
        $(self)
          .find('tr td.' + config.dataCellClass + ' .' + config.dataClass + ' input')
          .live('blur', function(e) {
            // Remove active class from parent row
            $(this).closest('tr').removeClass('active');
            
            // Trigger blur callback (for saving)
            if ($.isFunction(config.blurCallback)) {
              var parent = getParent(self, $(this).closest('tr'));
            
              config.blurCallback.call(this, $(this).closest('tr'), parent);
            }
            
            // Remove input element
            var data = $(this).val();
            $(this)
              .closest('td.' + config.dataCellClass + ' .' + config.dataClass)
              .html(data);
        });
        
        /**
         * Make it so that clicking on an element with the class config.addClass
         * adds a child to the selected element
         */
        
        $(self)
          .find('td.' + config.dataCellClass + ' .' + config.addClass)
          .live('click', function(e) {
            // Trigger a blur event on the active input
            $(this)
              .closest('tr')
              .find('td.' + config.dataCellClass + ' .' + config.dataClass + ' input')
              .trigger('blur');

            // Add a child to the active row
            var childId = addChild(self, $(this).closest('tr'));

            // Trigger a click event on the newly added child
            $('tr#' + childId)
              .find('td.' + config.dataCellClass + ' .' + config.dataClass)
              .trigger('click');
        });
      }
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
    
    if (0 < expandedChildren.length) {
      expandedChildren.each(function() {
        toggleChildren(container, $(this));
      });
    }
  };
  
  /**
   * Private function showFirstLevelChildren.
   *
   * @param container: containing element used to control the scope of the function.
   * @param parent: the parent element
   */

  function showFirstlevelChildren(container, parent) {
    var parentId = parent.attr('id');
    var children = $(container).find('.child-of-' + parentId);

    $(container).find('.child-of-' + parentId).each(function() {
      $(this).show();
    });
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
   * Private function validateDrop. This function checks if the user is trying
   * to drop a family in it's own child/descendant. If so it returns false.
   *
   * @param family: the draggable helper object
   * @param target: the droppable target row
   */
  
  function validateDrop(family, target) {
    if (0 < $(family).find('#' + $(target).attr('id')).length) {
      return false;
    }
    
    return true;
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
  
    convertFamily(container, family, target);
  
    var targetFamily = $('<div class="family-holder"><table></table></div>');
    getFamily(container, targetFamily, target);

    if (targetFamily.find('tr').length > 0) {
      target = $(container).find('#' + targetFamily.find('tr:last-child').attr('id'));
    }

    family.find('table tbody').children().insertAfter($(target));
    
    toggleParenthood(container);
    
    if ($.isFunction(config.appendCallback)) {
      config.appendCallback.call(this, family, target);
    }
  }
  
  /**
   * Private function insertFamilyBefore.
   *
   * @param container: the containing element
   * @param family: the draggable helper object
   * @param target: the droppable target row
   */

  function insertFamilyBefore(container, family, target) {
    var config = $(container).data('config');

    var targetParent = getParent(container, target);

    convertFamily(container, family, targetParent);

    family.find('table tbody').children().insertBefore($(target));
    
    toggleParenthood(container);
    
    if ($.isFunction(config.insertBeforeCallback)) {
      config.insertBeforeCallback.call(this, family, target);
    }
  }
  
  /**
   * Private function insertFamilyAfter.
   *
   * @param container: the containing element
   * @param family: the draggable helper object
   * @param target: the droppable target row
   */

  function insertFamilyAfter(container, family, target) {
    var config = $(container).data('config');

    var targetParent = getParent(container, target);
    
    var targetFamily = $('<div class="family-holder"><table></table></div>');
    getFamily(container, targetFamily, target);

    if (targetFamily.find('tr').length > 0) {
      target = $(container).find('#' + targetFamily.find('tr:last-child').attr('id'));
    }

    convertFamily(container, family, targetParent);

    family.find('table tbody').children().insertAfter($(target));
    
    toggleParenthood(container);
    
    if ($.isFunction(config.insertAfterCallback)) {
      config.insertAfterCallback.call(this, family, target);
    }
  }
  
  /**
   * Private function convertFamily. This function is used by the three different
   * drop action functions appendFamily, insertFamilyBefore and inserFamilyAfter.
   * It analyses where in the table the family is to be inserted and changes its
   * classes accordingly.
   *
   * @param container: the containing element
   * @param family: the draggable helper object
   * @param target: the droppable target row
   */
  
  function convertFamily(container, family, target) {
    var config = $(container).data('config');

    var targetLevel = (false == target) ? -1 : getLevel($(target).attr('class'));
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
  }
  
  /**
   * Private function toggleParenthood. Removes expand/collapse links from
   * items that do not need them.
   *
   * @param container: the containing element
   */
  
  function toggleParenthood(container) {
    var config = $(container).data('config');
  
    $(container).find('tr').each(function() {
      var parentId = $(this).attr('id')
    
      if (0 < parentId.length) {
        var target = $(container).find('#' + parentId);

        if (0 >= $(container).find('.child-of-' + parentId).length) {
          target.removeClass(config.parentClass + ' expanded collapsed')
          target.find('td.' + config.dataCellClass).removeClass(config.parentClass + ' expanded collapsed')
        } else {
          target.addClass(config.parentClass + ' expanded');
          target.find('td.' + config.dataCellClass).addClass(config.parentClass + ' expanded');
        }
      }
    });
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
   * @param levelClass: string
   */
  
  function getLevel(levelClass) {
    var startPos = levelClass.indexOf('level') + 5;
    var endPos = levelClass.indexOf(' ', startPos);

    return (-1 != endPos) ? parseInt( levelClass.substring(startPos, endPos) )
                          : parseInt( levelClass.substring(startPos) );
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
   * Private function getParent.
   *
   * @param container: the containing element
   * @param child: child object
   */
  
  function getParent(container, child) {
    var parentClass = getParentClass(child);
    var parentId = (false == parentClass) ? false : parentClass.substring(9);

    return (false == parentClass) ? false : $(container).find('#' + parentId);
  }
  
  /**
   * Private function setParent. Assigns a row the correct parent row by 
   * class name
   *
   * @param parent: parent object
   * @param child: child object
   */
  
  function setParent(parent, child) {
    var curClass = getParentClass(child);

    $(child).removeClass(curClass);
    if (false != parent) {
        $(child).addClass('child-of-' + $(parent).attr('id'));
    }
  }
  
  /**
   * Private function getParentClass.
   *
   * @param child: child object
   */
  
  function getParentClass(child) {
    var parentClass = $(child).attr('class');    
    
    if (undefined === parentClass) return false;
    
    var startPos = parentClass.indexOf('child-of-');
    var endPos = parentClass.indexOf(' ', startPos);

    if (-1 == startPos) {
      return false;
    }

    return (-1 != endPos) ? parentClass.substring(startPos, endPos)
                          : parentClass.substring(startPos);
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

    var parentClass = $(child).attr('class');
    var startPos = parentClass.indexOf('child-of-') + 9;
    var endPos = parentClass.indexOf(' ', startPos);
    var parentId = (-1 != endPos) ? parentClass.substring(startPos, endPos)
                                  : parentClass.substring(startPos);

    if (0 >= $(container).find('.child-of-' + parentId).length) {
      $(container).find('#' + parentId).removeClass(config.parentClass + ' expanded collapsed');
    } else {
      $(container).find('#' + parentId).addClass(config.parentClass + ' expanded collapsed');
    }
  }
  
  /**
   * Private function addChild.
   *
   * @param container: the containing element
   * @param parent: parent object
   */
  
  function addChild(container, parent) {
    var config = $(container).data('config');
  
    // Add parent class to parent row and expand all children
    $(parent).addClass(config.parentClass).addClass('expanded');
    $(parent).find('td.' + config.dataCellClass).addClass('expanded');
    
    showFirstlevelChildren(container, parent);
    
    // Find the row with the highest ID and add 1
    var id = 0;
    $(container).find('tr').each(function(index, val) {
      curId = parseInt($(this).attr('id').substring(3));
      id = (id < curId) ? curId : id;
    });
    id++;

    // Get the level and the parent ID
    var level = getLevel($(parent).attr('class')) + 1;
    var parentId = $(parent).attr('id');

    // Set the HTML for the table rows content    
    var childData = '<td class="' + config.dataCellClass + '"><span class="add-edit-icons"><a href="#" title="Add child" class="' + config.addClass + '"><img src="/dv-admin/pix/bgNestedSortable/add.gif" alt="Add child" width="12" height="12" /></a><a href="#" title="Edit node"><img src="/dv-admin/pix/bgNestedSortable/edit.gif" alt="Edit node" width="12" height="12" /></a></span><span class="' + config.iconClass + '"></span><form action="#" method="post"><input type="hidden" name="id" id="row' + id + '-id" value="0" /><input type="hidden" name="categoryID" id="row' + id + '-categoryID" value="12" /><span class="' + config.dataClass + '">Ny artikel</span></form></td><td></td><td></td>';
    
    // Append the row at the right place in the document
    var child = $('<tr id="row' + id + '" class="child-of-' + parentId + ' level' + level + '">' + childData + '</tr>').insertAfter($(parent));

    if ($.isFunction(config.addChildCallback)) {
      config.addChildCallback.call(this, id, parent);
    }
    
    return 'row' + id;
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
                    
    var dropAction = false;

    dropAction = ( mouseY > droppableRange.top && mouseY < droppableRange.bottom )
                    ? 'append' : dropAction;

    dropAction = ( mouseY > topRange.top && mouseY < topRange.bottom )
                    ? 'insertBefore' : dropAction;

    dropAction = ( mouseY > bottomRange.top && mouseY < bottomRange.bottom )
                    ? 'insertAfter' : dropAction;
    
    return dropAction;
  }
  
  /**
   * Private function showDropIndicator.
   *
   * @param container: the containing element
   * @param dropAction: the action to be taken on drop
   * @param target: the target droppable
   */

  function showDropIndicator(container, dropAction, target) {
    target.removeClass('bg-nested-table-droppable-append-hover');
    target.siblings().removeClass('bg-nested-table-droppable-hover');
  
    switch(dropAction) {
      case 'append':
        target.addClass('bg-nested-table-droppable-append-hover');
        break;

      case 'insertBefore':
        showDropIndicatorBar(container, dropAction, target);
        break;

      case 'insertAfter':
        showDropIndicatorBar(container, dropAction, target);
        break;

      default:
        break;
    }
  }
  
  /**
   * Private function showDropIndicatorBar.
   *
   * @param container: the containing element
   * @param dropAction: the action to be taken on drop
   * @param target: the target droppable
   */
  
  function showDropIndicatorBar(container, dropAction, target) {
    var config = $(container).data('config');
  
    var maxW = parseInt(target.parent('tbody').find('tr:first-child td.' + config.dataCellClass).width());
    var delta = parseInt(maxW - target.find('td.' + config.dataCellClass).width());
    
    var offset = target.find('td.' + config.dataCellClass).offset();

    var top = ('insertBefore' == dropAction)
                ? parseInt(offset.top)
                : parseInt(offset.top + target.find('td.' + config.dataCellClass).height());

    var left = parseInt(offset.left + delta);
    
    var w = parseInt(target.width() - delta);

    $('body').append('<div class="drop-indicator-bar" style="height: 1px; width: '
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
  }
  
  /**
   * Private function getDistance. Gets the distance from the mouse cursor
   * to the targets edges.
   *
   * @param mouseX: mouse x position
   * @param mouseY: mouse y position
   * @param target: the target object
   */
  
  function getDistance(mouseX, mouseY, target) {
    var center = getCenter(target);
    var vector = { x: Math.abs(mouseX-center.x), y: Math.abs(mouseY-center.y) };
    var edgeDistance = {  x: vector.x - (target.width() / 2),
                          y: vector.y - (target.height() / 2) };

    return Math.max(edgeDistance.x, edgeDistance.y);
  }
  
  /**
   * Private function getCenter. Gets the x and y of an objects center
   *
   * @param target: the target object
   */

  function getCenter(target) {
    var offset = $(target).offset();

    return {
      x:offset.left+ ($(target).width() / 2),
      y:offset.top + ($(target).height() / 2)
    }
  }
})(jQuery);