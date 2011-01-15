(function($) {

  /**
   * Name: bgOutliner
   * Author: Henrik Almér for AGoodId
   * Version: Alpha 2
   * Last edited: Jan 14 2011
   * Size: -- KB (minified -- KB)
   *
   * This plugin controls expand/collapse and drag/drop of nested
   * structures presented in table form.
   *
   * Dependencies: jQuery, jQueryUI Core, jQuery UI Draggable,
   *               jQuery UI Droppable
   *
   * TODO: Make sure the drop indicator accurately reflects the drop
   * TODO: Create prettier dialog boxes on faulty drops, maybe with ui.dialog?
   */

  var pluginName = 'bgOutliner';

  var config = {
    'addClass'              : 'add-child',
    'childHtml'             : '<td class="%dataCellClass%"><span class="add-edit-icons"><a href="#" title="Add child" class="%addClass%"><img src="/pix/bgNestedSortable/add.gif" alt="Add child" width="12" height="12" /></a><a href="#" title="Edit node"><img src="/pix/bgNestedSortable/edit.gif" alt="Edit node" width="12" height="12" /></a></span><span class="%iconClass%"></span><span class="%dataClass%">Ny artikel</span></td><td></td><td></td>',
    'collapsedClass'        : 'collapsed',
    'dataName'              : 'data',
    'dataClass'             : 'nested-data',
    'dataCellClass'         : 'nested-data-cell',
    'dragAndDrop'           : true,
    'expandCollapse'        : true,
    'expandedClass'         : 'expanded',
    'expColIconClass'       : 'expand-collapse-icon',
    'hoverClass'            : 'hover',
    'initHidden'            : true,
    'interval'              : 30,
    'onAddChild'            : false,
    'onAppend'              : false,
    'onBlur'                : false,
    'onDelete'              : false,
    'onDestroy'             : false,
    'onDrop'                : false,
    'onInit'                : false,
    'onInsertBefore'        : false,
    'onInsertAfter'         : false,
    'parentClass'           : 'has-children',
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
                          + ' and instance of jQUery.'
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
          .find("tr[class*='" + settings.parentClass + "']")
          .addClass(initClass);

        // Assign click handlers to expand/collapse-links
        $self
        .find('tr.' + settings.parentClass + ' td.'
              + settings.dataCellClass + ' .'
              + settings.expColIconClass)
        .live('click.' + pluginName, function(e) {
          $(this).closest('tr')
                  .toggleClass(settings.collapsedClass)
                  .toggleClass(settings.expandedClass);

          $self.bgOutliner('toggleChildren', $(this).closest('tr'));

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
        .find('tr.' + settings.parentClass + ' td.'
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
     * Method for toggling visibility of a parents children. Runs
     * recursively to toggle all children and grand-children when an
     * expand/collapse-link is clicked.
     *
     * CONTRACT
     * Expected input: A table row that is a direct descendant to an
     *                 instanced element.
     *
     * Return:         A reference to the instanced DOM element
     */

    toggleChildren: function($parent) {
      var $self = this;
      
      // Honor the contract
      assertInstanceOfBgOutliner($self);
      assertChildOf($self, $parent);

      // Find already expanded children and store them
      var idParent = $parent.attr('id');
      var $expandedChildren = $self.find('.child-of-' + idParent + '.'
                                        + $self.data(pluginName)
                                          .settings.expandedClass);

      // Toggle all direct children
      this.find('.child-of-' + idParent).each(function() {
        $(this).toggle();
      });

      // Call recursively to toggle all descendants
      if (0 < $expandedChildren.length) {
        $expandedChildren.each(function() {
          $self.bgOutliner('toggleChildren', $(this));
        });
      }
      
      return $self;
    }, // End methods.toggleChildren

    addNode: function() {
    }, // End methods.addNode

    removeNode: function() {
    }, // End methods.removeNode

    appendNode: function() {
    }, // End methods.appendNode

    insertBefore: function() {
    }, // End methods.insertBefore

    insertAfter: function() {
    }, // End methods.insertBefore

    getDescendants: function() {
    }, // End methods.getDescendants

    getParent: function() {
    }, // End methods.getParent

    getLevel: function() {
    }, // End methods.getLevel

    setDescendants: function() {
    }, // End methods.setDescendants

    setParent: function() {
    }, // End methods.setParent

    setLevel: function() {
    } // End methods.setLevel
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
  
  var assertChildOf = function($instance, $row) {  
    if (!$row.parent().is('#' + $instance.attr('id'))) {
      throw new Error('jQuery.'
                      + pluginName
                      + ' Error. Element is not child of instanced'
                      + 'element');
    }
    
    return true;
  }; // End assertChildOf
})(jQuery);