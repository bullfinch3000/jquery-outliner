(function($) {

  /**
   * Name: bgOutliner
   * Author: Henrik Almér for AGoodId
   * Version: Alpha 2
   * Last edited: Jan 17 2011
   * Size: -- KB (minified -- KB)
   *
   * This plugin controls expand/collapse and drag/drop of nested
   * structures presented in table form.
   *
   * Dependencies: jQuery, jQueryUI Core, jQuery UI Draggable,
   *               jQuery UI Droppable
   *
   * TODO: Make sure the drop indicator accurately reflects the drop
   * TODO: Create prettier dialog boxes on faulty drops, maybe with
   *       ui.dialog?
   */

  var pluginName = 'bgOutliner';

  var config = {
    'addClass'              : 'add-child',
    'childHtml'             : '<td class="%dataCellClass%">'
                              + '<span class="add-edit-icons">'
                              + '<a href="#" title="Add child"'
                              + ' class="%addClass%">'
                              + '<img src="'
                              + '../images/add.gif" alt="Add child"'
                              + ' width="12" height="12" />'
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
    'expandCollapse'        : true,
    'expandedClass'         : 'expanded',
    'expColIconClass'       : 'expand-collapse-icon',
    'hasChildrenClass'      : 'has-children',
    'hoverClass'            : 'hover',
    'idPrefix'              : 'row',
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
    'removeClass'           : 'remove-child',
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

        // Assign click handlers to expand/collapse-links
        $self
        .find('tr.' + settings.hasChildrenClass + ' td.'
              + settings.dataCellClass + ' .'
              + settings.expColIconClass)
        .live('click.' + pluginName, function(e) {
          $self.bgOutliner('toggleNode', $(this).closest('tr'));

          e.preventDefault();
        });
        
        // Make hover event toggle a hover class
        $self.find('tr').live('hover.' + pluginName, function(e) {
          $(this).toggleClass(settings.hoverClass);
        });

        // Call the onInit callback function, if it is defined
        if ($.isFunction(settings.onInit)) {
          settings.onInit.call(this);
        }
      });
    }, // End methods.init

    /**
     * Method for destroying an instance of this plugin. Removes all
     * plugin data and all bound events.
     *
     * CONTRACT
     * Expected input: A DOM element that is a plugin instance
     *
     * Return:         A reference to the supplied DOM element
     */

    destroy: function() {
      return this.each(function() {
        var $self = $(this),
            data = $self.data(pluginName);

        assertInstanceOfBgOutliner($self);

        settings = $self.data(pluginName).settings;

        // Unbind live click handlers from expand/collapse links
        $self
        .find('tr.' + settings.hasChildrenClass + ' td.'
              + settings.dataCellClass + ' .'
              + settings.expColIconClass)
        .die('click.' + pluginName);
        
        // Unbind hover event
        $self.find('tr').die('hover.' + pluginName);

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
          // Find the last child of the target node
          $lastChild = $self.find('.'
                                  + settings.childOfClassPrefix
                                  + $target.attr('id')
                                  + ':last');
          targetIndex = $lastChild.index();
        }
      } else {
        $target.addClass(settings.hasChildrenClass);
      }

      // Insert the elements
      $.each($family, function() {
        $(this).insertAfter($self.find('tr:eq(' + targetIndex + ')'));
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

    getLevel: function($parent) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $parent);
      
      var iLevel,
          iEndPos,
          iStartPos,
          sLevelClass,
          settings;
      
      var settings = $self.data(pluginName).settings;
      
      // Parse level class
      sLevelClass = $parent.attr('class');
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

    setDescendants: function() {
    }, // End methods.setDescendants

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

    setLevel: function() {
    }, // End methods.setLevel
    
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
    } // End methods.hasChildren
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
                      + 'element');
    }
    
    return true;
  }; // End assertChildOf
})(jQuery);