(function($) {

  /**
   * Name: bgOutliner
   * Author: Henrik Almér <henrik@agoodid.se>
   * Company: AGoodId
   * URL: http://www.agoodid.se
   * Version: Alpha 3
   * Last edited: Jan 19 2011
   * Size: -- KB (minified -- KB)
   *
   * This plugin controls expand/collapse and drag/drop of nested
   * structures presented in table form.
   *
   * Dependencies: jQuery, jQueryUI Core, jQuery UI Draggable,
   *               jQuery UI Droppable
   *
   * TODO: Make sure the drop indicator accurately reflects the drop
   * TODO: Make the element to be used as draghandle a user setting
   * TODO: Make the droppable active and hover classes a user setting
   * TODO: Make sure the destroy method removes all data, event handlers
   *       and draggables and droppables.
   */

  var pluginName = 'bgOutliner';

  var config = {
    'addClass'              : 'add-node',
    'childHtml'             : '<td class="%dataCellClass%">'
                              + '<span class="add-edit-icons">'
                              + '<a href="#" title="Add node"'
                              + ' class="%addClass%">'
                              + '<img src="'
                              + '../images/add.gif" alt="Add node"'
                              + ' width="12" height="12" />'
                              + '</a>'
                              + '<a href="#" title="Remove node"'
                              + ' class="%removeClass%">'
                              + '<img src="'
                              + '../images/trash.gif" alt="Remove node"'
                              + ' width="16" height="16" />'
                              + '</a>'
                              + '</span>'
                              + '<span class="%expColIconClass%">'
                              + '</span>'
                              + '<span class="%dataClass%">'
                              + 'Ny artikel'
                              + '</span>'
                              + '</td>'
                              + '<td></td>'
                              + '<td></td>',
    'childOfClassPrefix'    : 'child-of-',
    'collapsedClass'        : 'collapsed',
    'dataName'              : 'data',
    'dataClass'             : 'nested-data',
    'dataCellClass'         : 'nested-data-cell',
    'dragAndDrop'           : true,
    'edit'                  : true,
    'expandCollapse'        : true,
    'expandedClass'         : 'expanded',
    'expColIconClass'       : 'expand-collapse-icon',
    'hasChildrenClass'      : 'has-children',
    'hoverClass'            : 'hover',
    'idPrefix'              : 'row',
    'indent'                : 20,
    'initHidden'            : true,
    'interval'              : 30,
    'levelClassPrefix'      : 'level',
    'onAddNode'             : false,
    'onAppend'              : false,
    'onBlur'                : false,
    'onDelete'              : false,
    'onDestroy'             : false,
    'onDrop'                : false,
    'onInit'                : false,
    'onInsertBefore'        : false,
    'onInsertAfter'         : false,
    'prepend'               : false,
    'removeClass'           : 'remove-node',
    'tolerance'             : 1
  }; // End config

  /**
   * Public methods
   */

  var methods = {

    /**
     * Method for initiating an instance of this plugin on a DOM element
     *
     * @param settings: JavaScript object of settings
     *
     * CONTRACT
     * Expected input: A DOM element that is not already an instance of
     *                 the plugin and that is the immidiate parent of
     *                 one or more table rows (could be a table, tbody,
     *                 thead or tfooter element). Also takes an optional
     *                 javascript object of settings.
     *
     * Return:         A reference to the supplied DOM object.
     */

    init: function(settings) {
      return this.each(function() {
        var $self = $(this),
            data = $self.data(pluginName);

        // Make sure we abide by our contract
        if (data) {
          throw new Error('jQuery.'
                          + pluginName
                          + ' Init Error. Supplied element is already'
                          + ' and instance of jQuery.'
                          + pluginName);
        }
        if ($self.children('tr').length <= 0) {
          throw new Error('jQuery.'
                          + pluginName
                          + ' Init Error. Supplied element is not'
                          + ' parent to any tr elements');
        }

        // Initiate plugin
        $self.data(pluginName, {
          settings  : config
        });

        // Update settings
        if (settings) $.extend($self.data(pluginName).settings,
                                settings);

        settings = $self.data(pluginName).settings;

        // Hide all children on init, if initHidden is true
        var initClass;
        if (settings.initHidden) {
          $self.find("tr[class*='child-of-']").hide();
          initClass= settings.collapsedClass;
        } else {
          initClass = settings.expandedClass;
        }
        $self
          .find("tr[class*='" + settings.hasChildrenClass + "']")
          .addClass(initClass);
        
        // Iterate over all nodes and set their indentaion level
        $self.find('tr').each(function() {
          $self.bgOutliner('setIndentation', $(this));
        });

        // Assign click handlers to expand/collapse-links
        $self
        .find('tr.' + settings.hasChildrenClass + ' td.'
              + settings.dataCellClass + ' .'
              + settings.expColIconClass)
        .live('click.' + pluginName, function(e) {
          $self.bgOutliner('toggleNode', $(this).closest('tr'));

          e.preventDefault();
        });
        
        // Make mousover/mousout events toggle a hover class
        $self.find('tr').live('mouseover.' + pluginName, function(e) {
          $(this).addClass(settings.hoverClass);
        }).live('mouseout.' + pluginName, function(e) {
          $(this).removeClass(settings.hoverClass);
        });
        
        // Do further init setups for editing of nodes, if edit is true
        if (settings.edit == true) {
          $self.bgOutliner('initEdit');
        }

        // Call the onInit callback function, if it is defined
        if ($.isFunction(settings.onInit)) {
          settings.onInit.call(this);
        }
      });
    }, // End methods.init
    
    /**
     * Initiates the editing (drag and drop) capabilities of the
     * outliner. Should be called by the init method if the edit setting
     * is set to true.
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance
     *
     * Return:         A reference to the supplied DOM element
     */
    
    initEdit: function() {
      var $self = this;

      // Honor the contract
      assertInstanceOfBgOutliner($self);

      // Alias data and settings
      var data = $self.data(pluginName),
          settings = data.settings;
      
      /**
       * Create drop indicator
       */
      
      var dropIndicatorHtml = '<div class="drop-indicator-bar">'
                              + '<div class="col-indicator">'
                              + '<div class="thick-rule"></div>'
                              + '</div>'
                              + '<div class="row-indicator">'
                              + '<div class="thin-rule"></div>'
                              + '</div>'
                              + '</div>';

      data.dropIndicator = $(dropIndicatorHtml);
      $('body').append(data.dropIndicator);

      // Set position and width of drop indicator
      data.dropIndicator.offset($self.offset());
      data.dropIndicator.width($self.outerWidth());
      
      var hoveredLevel,
          hoveredRow,
          hoveredRowLevel,
          lastMousePos = { x: 0, y: 0 },
          lastRun = 0,
          relativeDropPos,
          targetLevel,
          targetPosition = {top: 0, left: 0},
          targetRow,
          thisMousePos,
          thisRun = 0;

      // Get the base indent (the number of pixels from the left edge of
      // the instance to the level 0 expand collapse icon)
      data.leftColumn = $self
                        .find('tr:first .' + settings.expColIconClass)
                        .offset().left;

      /**
       * Define settings for jQuery UI Draggable & Droppable
       */

var debugOutput = '';
$('body').append('<div id="testarea"></div>');

      var draggableConfig = {
        appendTo        : 'body',
        revert          : 'invalid',
        revertDuration  : 0,
        drag: function(e, ui) {

          /**
           * Drag function. Determines what action to take when dragging
           * stops. We need this information in orde be able to show a
           * correctly positioned drop indicator.
           *
           * CONTRACT
           * Expected input: A jQuery event and a reference to the UI
           *                 object.
           *
           * Return:         –
           */

          // Check for throttling
          thisRun = new Date().getTime();
          if(settings.interval > thisRun - lastRun ) {
            return;
          }
          lastRun = thisRun;

          // Check if mouse position has changed
          thisMousePos = { x: e.pageX, y: e.pageY };
          if (lastMousePos.x == thisMousePos.x
              &&
              lastMousePos.y == thisMousePos.y ) {
            return;
          }
          lastMousePos = thisMousePos;

          // Find the row being hovered
          $self.find('tr').each(function() {
            // Add proportions and offset data to the row (required by
            // jQuery UI Droppable)
            this.proportions = { width: this.offsetWidth, height: this.offsetHeight };
            this.offset = $(this).offset();
            
            // Use the intersect function of jQuery UI Droppable to
            // determine if this row is being hovered
            var intersect = $.ui.intersect($.ui.ddmanager.current, this, 'pointer');
            
            // Assign hover class if this row is hovered
            if (intersect) {
              $(this).addClass(settings.hoverClass);
            } else {
              $(this).removeClass(settings.hoverClass);
            }
          });
          
          hoveredRow = $self.find('.' + settings.hoverClass);

          /**
           * Determine at what level the user wants to drop the node.
           * We do this by defining columns that are as wide as the
           * indent setting and checking which column the mouse is in.
           */

          relativeDropPos = thisMousePos.x - data.leftColumn;
          if (relativeDropPos <= 0) {
            hoveredLevel = 0;
          } else {
            hoveredLevel = relativeDropPos/settings.indent;
          }
          hoveredLevel = parseInt(hoveredLevel);

          // Make sure that the level is no more than one level higher
          // than the target level.
          if (hoveredRow.length > 0) {
            hoveredRowLevel = $self.bgOutliner('getLevel', hoveredRow);
            if (hoveredLevel > hoveredRowLevel + 1) {
              hoveredLevel = hoveredRowLevel + 1;
            }
          } else {
            hoveredLevel = 0;
          }

          // Get droppable positions
          data.dropPositionsForLevel =
            $self.bgOutliner('getDropPositionsForLevel', hoveredLevel);
          data.invalidDropPositions = 
            $self.bgOutliner('getInvalidDropPositions',
                              $(e.target).closest('tr'),
                              hoveredLevel);

          data.dropPositions =
            data.dropPositionsForLevel.filter(function(val, ix) {
               return data.invalidDropPositions.indexOf(val) == -1;
            });

          // Determine closest candidate for drop
          $.each(data.dropPositions, function(ix, pos) {
            if (hoveredRow.index() <= pos) {
              targetRow = $self.find('tr:eq(' + (pos - 1) + ')');
              return false;
            }
          });
          targetLevel = hoveredLevel;

debugOutput = 'Target row: ' + (targetRow.index() + 1) + '<br /><br />';

debugOutput += 'positions for level: [';
$.each(data.dropPositionsForLevel, function(ix, val) {
  debugOutput += val + ', ';
})
debugOutput += ']<br />';

debugOutput += 'invalid positions: [';
$.each(data.invalidDropPositions, function(ix, val) {
  debugOutput += val + ', ';
})
debugOutput += ']<br />';

debugOutput += 'resulting positions: [';
$.each(data.dropPositions, function(ix, val) {
  debugOutput += val + ', ';
})
debugOutput += ']<br />';
$('#testarea').html(debugOutput);

          /**
           * Determine target rows position, settings the top variable
           * to be the bottom of the target row and the left variable to
           * the left side of the instanced DOM element.
           */

          if (targetRow.length > 0) {
            targetPosition.top = parseInt(targetRow.offset().top
                                      + targetRow.height()
                                      - (data.dropIndicator.height()/2));
            targetPosition.left = $self.offset().left;
            
            // Show/Update drop indicator
            $self.bgOutliner('showDropIndicator',
                              targetPosition,
                              targetLevel);

            // Store information about the target row in the data object
            data.targetRow = targetRow;
            data.targetLevel = targetLevel;
          }
        },
        stop: function(e, ui) {

          /**
           * Stop function
           */
          
          $self.bgOutliner('hideDropIndicator');
        },
        helper: function(e, ui) {

          /**
           * Helper function. Takes a dragged row and clones it to a new
           * table in a div. This enables us to show the dragged element
           * on screen while it's dragged.
           *
           * CONTRACT
           * Expected input: A jQuery event and a reference to the UI
           *                 object.
           *
           * Return:         A DOM element containing a table with the 
           *                 dragged nodes.
           */
          
          var $helper = $('<div class="nested-table-item-dragging">'
                          + '<table class="'
                          + pluginName
                          + '-dragging"></table>'
                          + '</div>')
                        .find('table')
                        .append($(e.target).closest('tr')
                                .clone()
                                .removeClass($self.data(pluginName)
                                              .settings.hoverClass));
          
          return $helper;
        }
      };
      
      /**
       * Initiate jQuery UI Draggable & Droppable
       */
      
      $self
      .find('tr')
      .draggable(draggableConfig)
      .data(pluginName, true);
      
      // Init Draggable & Droppable on live elements
      $self.find('tr').live('hover', function() {
        if ($(this).data(pluginName) != true) {
          $(this).data(pluginName, true);
          $(this).draggable(draggableConfig).droppable(droppableConfig);
        }
      });

      /**
       * Bind click handlers for adding and removing nodes
       */
      
      $self
      .find('td.' + config.dataCellClass + ' .' + config.addClass)
      .live('click.' + pluginName, function(e) {        
        // Add a node as child to the clicked node
        var childId = $self.bgOutliner('addNode',
                                        $(this).closest('tr'));
        e.preventDefault();
      });
      
      $self
      .find('td.' + config.dataCellClass + ' .' + config.removeClass)
      .live('click.' + pluginName, function(e) {        
        // Remove node
        var childId = $self.bgOutliner('removeNode',
                                        $(this).closest('tr'));
        e.preventDefault();
      });

      return $self;
    }, // End methods.initEdit

    /**
     * Method for destroying an instance of this plugin. Removes all
     * plugin data and all bound events.
     *
     * CONTRACT
     * Expected input: A collection of DOM elements that are a plugin
     *                 instances.
     *
     * Return:         A reference to the supplied DOM element
     */

    destroy: function() {
      return this.each(function() {
        var $self = $(this),
            data = $self.data(pluginName);

        assertInstanceOfBgOutliner($self);

        var settings = $self.data(pluginName).settings;

        // Unbind live click handlers from expand/collapse links
        $self
        .find('tr.' + settings.hasChildrenClass + ' td.'
              + settings.dataCellClass + ' .'
              + settings.expColIconClass)
        .die('click.' + pluginName);
        
        // Unbind hover event
        $self.find('tr').die('hover.' + pluginName);
        
        // Remove drop indicator, if it has been added
        if (data.dropIndicator) {
          data.dropIndicator.remove();
        }

        // Call the onDestroy callback function, if it is defined
        if ($.isFunction($self.data(pluginName).settings.onDestroy)) {
          $self.data(pluginName).settings.onDestroy.call(this);
        }

        // Remove all data associated with the plugin
        $self.removeData(pluginName);
      });
    }, // End methods.destroy
    
    /**
     * Method for updating settings for a plugin instance
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance
     *
     * Return:         A reference to the instanced DOM element
     */

    updateSettings: function(settings) {
      return this.each(function() {
        var $self = $(this);

        assertInstanceOfBgOutliner($self);
        
        // Update settings
        if (settings) $.extend($self.data(pluginName).settings,
                                settings);
      });
    },
    
    /**
     * Toggles expanded and collapsed classes for an element and calls
     * a helper function to toggle visibility of child elements.
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, and a
     *                 table row that is a direct descendant to the
     *                 supplied element.
     *
     * Return:         A reference to the instanced DOM element
     */
    
    toggleNode: function($node) {
      var $self = this;
    
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $node);
    
      // Toggle expandedClass and collapsedClass
      $node.toggleClass($self.data(pluginName)
                        .settings.expandedClass);
      $node.toggleClass($self.data(pluginName)
                        .settings.collapsedClass);

      // Toggle visibility of descendants
      $self.bgOutliner('toggleDescendants', $node);
      
      return $self;
    },

    /**
     * Method for toggling visibility of a parents descendants. Runs
     * recursively to toggle all children and grand-children.
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, and a
     *                 table row that is a direct descendant to the
     *                 supplied element.
     *
     * Return:         A reference to the instanced DOM element
     */

    toggleDescendants: function($node) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $node);

      // Find already expanded children and store them
      var sId = $node.attr('id');
      var $expandedChildren = $self.find('.child-of-' + sId + '.'
                                        + $self.data(pluginName)
                                          .settings.expandedClass);

      // Call recursively to toggle all descendants
      if ($expandedChildren.length > 0) {
        $expandedChildren.each(function() {
          $self.bgOutliner('toggleDescendants', $(this));
        });
      }
      
      // Toggle all direct children
      this.find('.child-of-' + sId).each(function() {
        $(this).toggle();
      });
      
      return $self;
    }, // End methods.toggleChildren

    /**
     * Expands node
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, and a
     *                 table row that is a direct descendant to the
     *                 supplied element.
     *
     * Return:         A reference to the instanced DOM element
     */

    expandNode: function($node) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $node);
      
      var settings = $self.data(pluginName).settings;
      
      if ($node.hasClass(settings.collapsedClass)) {
        $self.bgOutliner('toggleNode', $node);
      }
      
      // Add the expanded class
      $node
      .removeClass(settings.collapsedClass)
      .addClass(settings.expandedClass);
      
      return $self;
    }, // End methods.expandNode
    
    /**
     * Collapses node
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, and a
     *                 table row that is a direct descendant to the
     *                 supplied element.
     *
     * Return:         A reference to the instanced DOM element
     */
    
    collapseNode: function($node) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $node);
      
      var settings = $self.data(pluginName).settings;
      
      if ($node.hasClass(settings.expandedClass)) {
        $self.bgOutliner('toggleNode', $node);
      }
      
      // Add the collapsed class
      $node
      .removeClass(settings.expandedClass)
      .addClass(settings.collapsedClass);
      
      return $self;
    }, // End methods.collapseNode

    /**
     * Adds a new node to the instance. If a parent node is supplied the
     * new node is added as the first child of that parent node.
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, and an
     *                 optional table row that is a direct descendant to
     *                 the supplied element.
     *
     * Return:         A reference to the instanced DOM element
     */

    addNode: function($parent) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      if ($parent) {
        assertChildOf($self, $parent);
      }
      
      var $child,
          iLevel,
          iChildKey,
          iCurKey,
          sChildHtml,
          sChildId,
          sChildRow,
          sParentId;
      
      var settings = $self.data(pluginName).settings;
      
      // Get parent info
      if ($parent) {
        // Expand the parent node
        $self.bgOutliner('expandNode', $parent);

        // Get level and parent id
        iLevel = $self.bgOutliner('getLevel', $parent) + 1;
        sParentId = $parent.attr('id');
      } else {
        iLevel = 0;
        sParentId = null;
      }
      
      // Find the node with the highest id and add 1
      iChildKey = 0;
      $self.find('tr').each(function() {
        iCurKey = parseInt($(this).attr('id')
                    .substring(settings.idPrefix.length));
        iChildKey = (iChildKey < iCurKey) ? iCurKey : iChildKey;
      });
      iChildKey++;
      sChildId = settings.idPrefix + iChildKey.toString();
      
      // Generate HTML for child node
      sChildHtml = settings.childHtml
                    .replace(/%dataCellClass%/ig,
                              settings.dataCellClass)
                    .replace(/%addClass%/ig,
                              settings.addClass)
                    .replace(/%removeClass%/ig,
                              settings.removeClass)
                    .replace(/%expColIconClass%/ig,
                              settings.expColIconClass)
                    .replace(/%dataClass%/ig,
                              settings.dataClass);
      
      // Create the child node
      sChildRow = '<tr id="'
                  + sChildId
                  + '" class="';
      if (sParentId != null) {
        sChildRow = sChildRow
                    + settings.childOfClassPrefix
                    + sParentId
                    + ' ';
      }
      sChildRow = sChildRow
                  + settings.levelClassPrefix
                  + iLevel
                  + '">'
                  + sChildHtml
                  + '</tr>';
      
      $child = $(sChildRow);
      
      // Insert the child node at the correct place in the instance
      if ($parent) {
        // Add to existing node
        $self.bgOutliner('appendNode', $parent, $child);
      } else {
        // Add at root level
        if (settings.prepend) {
          $self.prepend($child);
        } else {
          $self.append($child);
        }
      }
      
      // Call the onAddNode callback function, if it is defined
      if ($.isFunction(settings.onAddNode)) {
        settings.onAddNode.call(this);
      }
      
      return $self;
    }, // End methods.addNode

    /**
     * Removes a node and all of its descendants
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, and a
     *                 (non optional) table row that is a direct
     *                 descendant to the supplied element.
     *
     * Return:         A reference to the instanced DOM element
     */

    removeNode: function($node) {
      var $self = this;

      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $node);

      var settings = $self.data(pluginName).settings;

      var iParent = $self.bgOutliner('getParent', $node);
      var $siblings = $self
                      .find('.' + settings.childOfClassPrefix
                            + settings.idPrefix
                            + iParent);

      // Check if the hasChildren class should be removed on the nodes
      // parent element
      if ($siblings.length <= 1) {
        $self
        .find('#' + settings.idPrefix + iParent)
        .removeClass(settings.hasChildrenClass);
      }

      // Remove all descendants
      if ($node.hasClass(settings.hasChildrenClass)) {
        $self
        .find('.' + settings.childOfClassPrefix + $node.attr('id'))
        .each(function() {
          $self.bgOutliner('removeNode', $(this));
        });
      }

      // Remove node
      $node.remove();      

      return $self;
    }, // End methods.removeNode

    /**
     * Appends a node to another node
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, a table
     *                 row that is a direct descendant to the supplied
     *                 element and one more table row that should be
     *                 appended to the target node.
     *
     * Return:         A reference to the instanced DOM element
     */

    appendNode: function($target, $node) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $target);
      
      var $family = [$node],
          $targetFamily,
          $lastDescendant,
          targetIndex = $target.index();
      
      var settings = $self.data(pluginName).settings;
      
      // Is this an existing node?
      if ($node.parent().is('#' + $self.attr('id'))) {
        $family = $self.bgOutliner('getFamily', $node);
        $self.bgOutliner('setParent', $target, $node);
      }

      // Does the target node already have children?
      if ($target.hasClass(settings.hasChildrenClass)) {
        // Insert at top or bottom?
        if (!settings.prepend) {
          // Find the last descendant of the target node
          $targetFamily = $self.bgOutliner('getFamily', $target);
          $lastDescendant = $targetFamily[$targetFamily.length - 1];
          targetIndex = $lastDescendant.index();
        }
      } else {
        $target.addClass(settings.hasChildrenClass);
        $self.bgOutliner('expandNode', $target);
      }

      // Insert the elements
      $.each($family, function() {
        $(this).insertAfter($self.find('tr:eq(' + targetIndex + ')'));
        $self.bgOutliner('setIndentation', $(this));
        targetIndex++;
      });
    
      if ($.isFunction(settings.onAppend)) {
        settings.onAppend.call(this);
      }
    }, // End methods.appendNode

    insertBefore: function($target, $node) {
    }, // End methods.insertBefore

    insertAfter: function($target, $node) {
    }, // End methods.insertBefore

    /**
     * Runs recursively to get a node with all of its descendants
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, and a
     *                 (non optional) table row that is a direct
     *                 descendant to the supplied element.
     *
     * Return:         An collection of DOM elements containing the
     *                 given node and all of its descendants.
     */

    getFamily: function($node) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $node);
      
      var settings = $self.data(pluginName).settings;
      
      var $family = [$node],
          $descendants = [];

      $self
      .find('.' + settings.childOfClassPrefix + $node.attr('id'))
      .each(function() {      
        if ($(this).hasClass(settings.hasChildrenClass)) {
          $descendants = $self.bgOutliner('getFamily', $(this));

          $.each($descendants, function() {
            $family.push($(this));
          });
        } else {
          $family.push($(this));
        }
      });
      
      return $family
    }, // End methods.getFamily

    /**
     * Gets the key part of the parent id for a child node
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, and a
     *                 (non optional) table row that is a direct
     *                 descendant to the supplied element.
     *
     * Return:         An integer representing the key of the provided
     *                 nodes parent, or null if the node has no parent.
     */

    getParent: function($node) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $node);
      
      var iKey,
          iEndPos,
          iStartPos,
          sClass;
      
      var settings = $self.data(pluginName).settings;
      
      // Extract the key indicating the parent from the nodes class
      sClass = $node.attr('class');
      if (sClass.indexOf(settings.childOfClassPrefix) != -1) {
        iStartPos = sClass.indexOf(settings.childOfClassPrefix)
                      + settings.childOfClassPrefix.length
                      + settings.idPrefix.length;
        iEndPos = sClass.indexOf(' ', iStartPos);
        
        iKey = (iEndPos != -1) ? parseInt(sClass.substring(iStartPos,
                                                           iEndPos))
                               : parseInt(sClass.substring(iStartPos));
      } else {
        iKey = null;
      }
    
      return iKey;
    }, // End methods.getParent

    /**
     * Gets the level of a node that is a child to an instance
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, and a
     *                 (non optional) table row that is a direct
     *                 descendant to the supplied element.
     *
     * Return:         An integer representing the supplied rows level
     */

    getLevel: function($node) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $node);
      
      var iLevel,
          iEndPos,
          iStartPos,
          sLevelClass,
          settings;
      
      var settings = $self.data(pluginName).settings;
      
      // Parse level class
      sLevelClass = $node.attr('class');
      iStartPos = sLevelClass.indexOf(settings.levelClassPrefix)
                                      + settings.levelClassPrefix
                                        .length;
      iEndPos = sLevelClass.indexOf(' ', iStartPos);

      iLevel = (-1 != iEndPos) ? parseInt(sLevelClass
                                            .substring(iStartPos,
                                                        iEndPos))
                               : parseInt(sLevelClass
                                            .substring(iStartPos));

      return iLevel;
    }, // End methods.getLevel

    /**
     * Sets the parent class for a node
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance and two
     *                 table row that are direct descendants to the
     *                 supplied element.
     *
     * Return:         A reference to the instance.
     */

    setParent: function($parent, $node) {
      var $self = this;
      
      // Honor contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $parent);
      assertChildOf($self, $node);
      
      var settings = $self.data(pluginName).settings;

      // Parse the current parent class and remove it
      var parentClass = $node.attr('class');
      
      var iStartPos = parentClass.indexOf(settings.childOfClassPrefix);
      var iEndPos = parentClass.indexOf(' ', iStartPos);

      if (-1 == iStartPos) {
        parentClass = false;
      } else {
        parentClass = (-1 != iEndPos) ? parentClass.substring(iStartPos, iEndPos)
                                      : parentClass.substring(iStartPos);
      }
      $node.removeClass(parentClass);
      
      // Add the new parent class
      if ($parent.length > 0) {
        $node.addClass(settings.childOfClassPrefix + $parent.attr('id'));
      }
      
      return $self;
    }, // End methods.setParent
    
    /**
     * Method that sets the indentation level for a node
     *
     * Expected input: A DOM element that is a plugin instance, and a
     *                 (non optional) table row that is a direct
     *                 descendant to the supplied element.
     *
     * Return:         A reference to the instance.
     */

    setIndentation: function($node) {
      var $self = this;

      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $node);
      
      var settings = $self.data(pluginName).settings;
      
      var margin = settings.indent * $self.bgOutliner('getLevel',
                                                      $node);
      
      $node
      .find('.' + settings.dataCellClass + ' .'
            + settings.expColIconClass)
      .css('margin-left', margin + 'px');

      return $self;
    }, // End methods.setIndentation
    
    /**
     * Method for checking if a node has children
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, and a
     *                 (non optional) table row that is a direct
     *                 descendant to the supplied element.
     *
     * Return:         A boolean value that is true if the node has
     *                 children and false if not.
     */
    
    hasChildren: function($node) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $node);
      
      var settings = $self.data(pluginName).settings;

      return $node.hasClass(settings.hasChildrenClass);
    }, // End methods.hasChildren
    
    /**
     * Shows a horizontal rule, indicating where a dragged element will
     * be placed once it is dropped.
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, a tuple
     *                 representing an absolute position on screen and
     *                 an integer representing the level to drop at.
     *
     * Return:         A reference to the instance
     */
    
    showDropIndicator: function(tPosition, iLevel) {
      var $self = this;

      // Honor the contract
      assertInstanceOfBgOutliner($self);

      var settings = $self.data(pluginName).settings;
      
      var baseIndent = $self.data(pluginName).leftColumn,
          colIndicatorWidth = baseIndent
            + (settings.indent * (iLevel));

      // Show drop indicator
      $self.data(pluginName).dropIndicator.show();

      // Set vertical position of drop indicator
      $self
      .data(pluginName)
      .dropIndicator
      .css({position: 'absolute', top: tPosition.top, left: tPosition.left});
      
      // Adjust width of col-indicator and row-indicator to match the
      // hovered level
      $self.data(pluginName).dropIndicator
        .find('.col-indicator')
        .width(colIndicatorWidth);
      $self.data(pluginName).dropIndicator
        .find('.row-indicator')
        .width($self.data(pluginName).dropIndicator.width()
                - colIndicatorWidth);

      return $self;
    }, // End methods.showDropIndicator
    
    /**
     * Hides the drop indicator
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance.
     *
     * Return:         A reference to the instance
     */
    
    hideDropIndicator: function() {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      
      $self.data(pluginName).dropIndicator.hide();
      
      return $self;
    }, // End methods.hideDropIndicator
    
    /**
     * Gets available drop position for the current level
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance and an
     *                 integer representing the level to fetch positions
     *                 for.
     *
     * Return:         An array of possible drop positions
     */
    
    getDropPositionsForLevel: function(iLevel) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      
      var settings = $self.data(pluginName).settings;
      
      var positions = [],
          $nodes,
          $parentLevelNodes,
          $nodeFamily;
      
      // Add all nodes at the current level to the collection
      $nodes = $self.find('.' + settings.levelClassPrefix + iLevel);

      if (iLevel > 0) {
        // If not at root level, add positions from the parent level
        $parentLevelNodes = $self.find('.'
                                        + settings.levelClassPrefix
                                        + (iLevel - 1));

        $parentLevelNodes.each(function() {
          positions.push($(this).index() + 1);
        });
      } else {
        // If we are at root level, add the 0 position
        positions.push(0);
      }

      $nodes.each(function() {
        if ($self.bgOutliner('hasChildren', $(this))) {
          $nodeFamily = $self.bgOutliner('getFamily', $(this));
          positions.push($nodeFamily[$nodeFamily.length - 1]
                          .index() + 1);
        } else {
          positions.push($(this).index() + 1);
        }
      });

      return positions.unique().sort(function(a, b) {
        return (a - b);
      });
    }, // End methods.getDropPositionsForLevel
    
    /**
     * Gets a list of invalid drop positions for a given node. Using
     * this method makes sure that no nodes can be dropped as
     * descendants to themselves.
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance, a (non
     *                 optional) table row that is a direct descendant
     *                 to the supplied element and an integer
     *                 representing a level.
     *
     * Return:         An array of invalid drop positions
     */
    
    getInvalidDropPositions: function($node, iLevel) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $node);
      
      var settings = $self.data(pluginName).settings;
      
      var $family,
          nodeLevel,
          positions = [];
      
      $family = $self.bgOutliner('getFamily', $node);
      
      $.each($family, function() {      
        positions.push($(this).index() + 1);
      });
      
      nodeLevel = $self.bgOutliner('getLevel', $node);
      while (iLevel < nodeLevel) {
        positions.pop();
      
        iLevel++;
      }
      
      return positions;
    } // End methods.getInvalidDropPositions
  }; // End methods

  /**
   * bgOutliner function.
   *
   * CONTRACT
   * Expected input: A DOM element and a string representing a method
   *                 in the methods object.
   *
   * Return:         The method that was requested.
   */

  $.fn.bgOutliner = function(method) {
    if (methods[method]) {
      return methods[method]
        .apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      throw new Error('Method '
                      + method
                      + ' does not exist on jQuery.' + pluginName);
    }
  }; // End $.fn.bgOutliner



  /*** PRIVATE METHODS ***/



  /**
   * This function is used to control that the supplied DOM element is
   * an instance of the plugin. If not it throws an error.
   *
   * CONTRACT
   * Expected input: A reference to a DOM object
   *
   * Return:         True on success. Throws error otherwise.
   */

  var assertInstanceOfBgOutliner = function($instance) {
    if (!$instance.data(pluginName)) {
      throw new Error('jQuery.'
                      + pluginName
                      + ' Instance Error. Element is not an instance'
                      + ' of jQuery.'
                      + pluginName);
    }
    
    return true;
  }; // End assertInstanceOfBgOutliner
  
  /**
   * This function is used to check if an element is the direct child of
   * another element.
   *
   * CONTRACT
   * Expected input: A reference to a DOM object and a potential child
   *
   * Return:         True on success. Throws error otherwise.
   */
  
  var assertChildOf = function($instance, $node) {  
    if (!$node.parent().is('#' + $instance.attr('id'))) {
      throw new Error('jQuery.'
                      + pluginName
                      + ' Error. Element is not child of instanced'
                      + ' element');
    }
    
    return true;
  }; // End assertChildOf
})(jQuery);

/**
 * Extend the array object with a "unique" method
 *
 * Source: http://www.martienus.com/code/
 *         javascript-remove-duplicates-from-array.html
 */

Array.prototype.unique = function () {
	var r = new Array();
	o:for(var i = 0, n = this.length; i < n; i++)
	{
		for(var x = 0, y = r.length; x < y; x++)
		{
			if(r[x]==this[i])
			{
				continue o;
			}
		}
		r[r.length] = this[i];
	}
	return r;
}