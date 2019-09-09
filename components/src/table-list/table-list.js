import {registerActionListener, deepCopy} from "../utils.js";

class TableList extends HTMLElement {
  constructor() {
    super();

    this.items = [];
    this.sort = null;
    this.subSort = null;
    this.listElem = null;
    this.listItemTemplate = null;
    this.listSubItemTemplate = null;
    this.loaded = 0;
    this.loadAmount = 50;
    this.scrollLoadPercentage = 0.8;
    this.defaultRowAttributes = {"data-key-down": "next-sibling", 
                                 "data-key-up": "previouse-sibling" };

    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        .tableList,
        .tableList ul
        {
          list-style: none;
          font-size: 13px;
          overflow: auto;
          padding: 4px;
        }

        .tableList
        {
          height: 270px;
        }

        .tableList ul
        {
          padding-bottom: 10px;
        }

        .tableList li > div
        {
          display: flex;
          padding: 5px 5px;
          align-items: center;
          cursor: pointer;
        }

        ul.tableList > li > div
        {
          padding-left: 9px;
          padding-right: 9px; 
        }

        .tableList li > div:hover
        {
          background-color: #cee0c2;
        }

        .tableList li[data-expanded="true"] > ul
        {
          border-top: 1px solid #324B2C;
        }

        .tableList li .data-container
        {
          flex-grow: 1;
        }

        .tableList li span
        {
          display: inline-block;
        }
        button.icon
        {
          background-color: transparent;
          border: none;
          width: 20px;
          padding: 0px;
          cursor: default;
        }
        button.icon:after
        {
          display: inline-block;
          content: "";
          width: 10px;
          height: 10px;
          margin: 0px auto;
        }
        button.icon.delete:after
        {
          background-image: url(../../../img/table-list/delete.svg);
        }
        button.icon.delete:hover:after
        {
          background-image: url(../../../img/table-list//delete-hover.svg);
        }
        button.icon.edit:after
        {
          background-image: url(../../../img/table-list//edit.svg);
        }
        button.icon.edit:hover:after
        {
          background-image: url(../../../img/table-list//edit-hover.svg);
        }
        button.icon.whitelist:after
        {
          background-image: url(../../../img/table-list//check-mark.svg);
        }
        button.icon.whitelist:hover:after
        {
          opacity: .8;
        }
        [data-whitelist="true"] button.icon.whitelist:after
        {
          background-image: url(../../../img/table-list//check-mark-active.svg);
        }
        [data-whitelist="true"] [data-whitelist="true"] button.icon.whitelist:after
        {
          background-image: url(../../../img/table-list//check-mark-double-active.svg);
        }
        .tableList .domainName
        {
          width: 300px
        }
        .tableList .cookieName
        {
          width: 280px;
        }
        .tableList .cookieValue
        {
          width: 100px;
          white-space: pre;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
      <ul class="tableList "></ul>
    `;
  }

  connectedCallback()
  {
    const [itemTemplate, subItemTemplate] = this.querySelectorAll("template");
    this.listItemTemplate = this._createRowFromTempalte(itemTemplate);
    this.listSubItemTemplate = this._createRowFromTempalte(subItemTemplate);
    this.sort = this._setSort(itemTemplate.getAttribute("sort"));
    this.subSort = this._setSort(subItemTemplate.getAttribute("sort"));

    this.listElem = this.shadowRoot.querySelector("ul");
    this.listElem.addEventListener("scroll", this._onScroll.bind(this), false);

    this.listElem.addEventListener("keydown", function(ev)
    {
      // Prevent the scrollable list from scrolling
      if (ev.key == "ArrowDown" || ev.key == "ArrowUp")
      {
        ev.preventDefault();
      }
    }, false);

    registerActionListener(this, this, this._onAction);
  }

  /**
   * Move dataset from the template into the new row element
   * @returns {Element} row element template
   */
  _createRowFromTempalte = (itemTemplate) => 
  {
    const element = document.createElement("li");
    Object.assign(element.dataset, itemTemplate.dataset);
    for (const name in this.defaultRowAttributes)
      element.setAttribute(name, this.defaultRowAttributes[name]);
    element.appendChild(itemTemplate.content);
    return element;
  }

  /**
   * A helper to create a template row element in order to write less HTML.
   * ex. Set attributes on the template attribute which will be copied into list
   * element. And specify some default data attributes on the rows and subrows.
   * @return {Array} topRow element and subRow element
   */
  _createListRowTemplate()
  {
    const [itemTemplate, subItemTemplate] = this.querySelectorAll("template");
    const createRowElement = (itemTemplate) => 
    {
      const element = document.createElement("li");
      Object.assign(element.dataset, itemTemplate.dataset);
      for (const name in this.defaultRowAttributes)
        element.setAttribute(name, this.defaultRowAttributes[name]);
      element.appendChild(itemTemplate.content);
      return element;
    }
    return [createRowElement(itemTemplate), createRowElement(subItemTemplate)];
  }

  /**
   * Add item and subItem to the Table list
   * @param {Array} itemObjs array of itemObj:
   * {
   *   id:       "itemId1",
   *   dataset:  {datasetname: "/"},
   *   texts:    {data-text-value: "example.com", data-text-value: "3 Cookies"}
   * }
   * @param {String} id parent item id, if skipped top level item is
   * added
   * @param {Boolean} _deepCopy uses shallow copy when false (default: true)
   */
  addItems(itemObjs, id, _deepCopy = true)
  {
    // If we don't deep copy the added items modification of the items on the
    // user side might affect actual data used for table-list
    const itemObjsCopy = _deepCopy ? deepCopy(itemObjs) : itemObjs;
    const parentItem = this.getItem(id, null, false);
    let sortMethod = this.sort;
    if (parentItem && !parentItem.subItems)
    {
      parentItem.subItems = [];
      sortMethod = this.subSort;
    }
    const items = parentItem ? parentItem.subItems : this.items;

    if (sortMethod)
    {
      // Sorting the additional items because "_loadItem" doesn't know which
      // one to add first, only the location in the whole sorted arrays.
      // This behavior might be changed with:
      // https://github.com/Manvel/webcomponents/issues/14
      itemObjsCopy.sort(sortMethod);
      items.push(...itemObjsCopy);
      if (items.length > 0)
        items.sort(sortMethod);
    }
    else
    {
      items.push(...itemObjsCopy);
    }

    for (const itemObj of itemObjsCopy)
    {
      if (parentItem)
      {
        this._loadItem(itemObj, id);
      }
      else  // Dynamic load only top level items
      {
        const itemIndex = this.items.indexOf(itemObj);
        if (itemIndex < this.loaded || itemIndex < this.loadAmount)
          this._loadItem(itemObj);
      }
    }
  }

  /**
   * Load item into the view
   * @param  {JSON} itemObj as specified in addItems
   */
  _loadItem(itemObj, parentId)
  {
    if (!itemObj.dataset)
      itemObj.dataset = {};

    if (!itemObj.id)
      itemObj.dataset.id = this.items.indexOf(itemObj);

    let listItem = this._itemFromTmpl(itemObj, this.listItemTemplate);
    let listItemsContainer = this.listElem;
    if (parentId)
    {
      listItem = this._itemFromTmpl(itemObj, this.listSubItemTemplate);
      const parentListElem = this.getItemElem(parentId);
      let subContainer = parentListElem.querySelector("ul");
      if (!subContainer)
        subContainer = parentListElem.appendChild(document.createElement("ul"));
      listItemsContainer = subContainer;
    }
    else
    {
      // Only top level lazy loading is supported.
      this.loaded++;
    }

    const itemIndex = this.getItemIndex(itemObj.id, parentId);
    const elemAfter = listItemsContainer.children[itemIndex];
    if (elemAfter)
      listItemsContainer.insertBefore(listItem, elemAfter);
    else
      listItemsContainer.appendChild(listItem);
  }

  /**
   * Scroll bar event handler
   */
  _onScroll()
  {
    const listClientScrollBottom = this.listElem.scrollTop +
      this.listElem.clientHeight;
    const percentage = listClientScrollBottom / this.listElem.scrollHeight;
    if (percentage > this.scrollLoadPercentage && this.loaded < this.items.length)
    {
      const loadLimit = this.loaded + this.loadAmount;
      for (let i = this.loaded -1; i < loadLimit && i < this.items.length; i++)
      {
        this._loadItem(this.items[i]);
      }
    }
  }

  /**
   * Remove item or subItem from the list
   * @param {String} id item ID
   * @param {String} parentId Parent item id ID, used to remove
   *                                subItem if specified(optional)
   * @param {Boolean} result
   */
  removeItem(id, parentId)
  {
    const index = this.getItemIndex(id, parentId);
    if (index >= 0)
    {
      if (parentId)
      {
        this._unloadSubItem(id, parentId);
        const parentItem = this.getItem(parentId, null, false);
        parentItem.subItems.splice(index, 1);
        const hasSubitems = parentItem.subItems.length;
        if (!hasSubitems)
          delete parentItem.subItems;
      }
      else
      {
        this._unloadItem(id);
        this.items.splice(index, 1);
      }
      return true;
    }
    return false;
  }

  /**
   * Sets the sorting method to be used when adding and updating items
   */
  _setSort(sortColumn)
  {
    if (sortColumn)
      return (a, b) => a.texts[sortColumn].localeCompare(b.texts[sortColumn], undefined, {numeric: true});
    else
      return null;
  }

  /**
   * Remove item Node from the DOM
   * @param {String} id item ID 
   */
  _unloadItem(id)
  {
    const itemElem = this.getItemElem(id);
    if (!itemElem)
      return;

    if (itemElem.isSameNode(this.shadowRoot.activeElement))
      this.selectItem(id, null, "next");
    this.listElem.removeChild(itemElem);
    this.loaded--;
  }

  /**
   * Remove sub item Node from the DOM
   * @param {String} id       item ID 
   * @param {String} parentId parent item id ID
   */
  _unloadSubItem(id, parentId)
  {
    const itemElem = this.getItemElem(id, parentId);
    if (!itemElem)
      return;

    const activeElement = this.shadowRoot.activeElement;
    if (activeElement.isSameNode(itemElem))
      this.selectItem(id, parentId, "next");

    const subListContainerElem = this.getItemElem(parentId);
    const subListElems = subListContainerElem.querySelector("ul");
    subListElems.removeChild(itemElem);
    if (!subListElems.children.length)
      subListContainerElem.removeChild(subListElems);
  }

  /**
   * DEPRECATED use removeItem(id, parentId) instead
   * Remove subitem
   * @param {String} parentId main item ID
   * @param {String} id subItem ID
   */
  removeSubItem(parentId, id)
  {
    const {index} = this.getItemIndex(parentId);
    if (index === false)
      return false;

    const item = this.items[index];
    const listItemElem = this.listElem.children[index];
    const subListItemElem = listItemElem.querySelector("ul");

    for (let i = 0; i < item.subItems.length; i++)
    {
      if (item.subItems[i].id == id)
      {
        if (item.subItems.length == 1)
        {
          this._onAction("next-sibling", listItemElem);
          listItemElem.removeChild(subListItemElem);
        }
        else
        {
          subListItemElem.children[i].parentElement.removeChild(
            subListItemElem.children[i]);
        }
        item.subItems.splice(i, 1);
      }
    }
  }

  /**
   * Deprecated use empty(id) instead
   * Remove All sub items
   * @param {String} id main item ID
   */
  removeAllSubItems(id)
  {
    const {item} = this.getItem(id, null, false);
    if (!item)
      return false;

    let i = item.subItems.length;
    while (i--) // Avoide re-indexing
      this.removeSubItem(item.id, item.subItems[i].id);

    delete item.subItems;
  }

  /**
   * DEPRECTATED
   * Check for subItem existance
   * @param {String} id main item ID
   * @param {String} id subItem ID
   * @return {Boolean} result
   */
  hasSubItem(parentId, id)
  {
    const {parentItem} = this.getItem(parentId);
    if (!parentItem || !parentItem.subItems)
      return false;

    for (let i = 0; i < parentItem.subItems.length; i++)
    {
      if (parentItem.subItems[i].id == id)
        return true;
    }
    return false;
  }

  /**
   * Update list element using itemObj
   * @param {JSON} itemObj
   * @param {Node} listElem target <li> element
   */
  _updateListElem(itemObj, listElem)
  {
    const datasetObj = itemObj.dataset;
    listElem.dataset.id = itemObj.id;
    for (const name in datasetObj)
      listElem.dataset[name] = datasetObj[name];

    const textsObj = itemObj.texts;
    for (const name in textsObj)
    {
      const textElement = listElem.querySelector("[data-text='"+ name +"']");
      if (textElement)
        textElement.textContent = textsObj[name];
    }
    const titleObjs = itemObj.titles;
    for (const title in titleObjs)
    {
      const titleElement = listElem.querySelector("[data-text='"+ title +"']");
      if (titleElement)
        titleElement.title = titleObjs[title];
    }

    // Set default tabindex to the first list Element
    if (this.listElem.childElementCount == 0)
      listElem.setAttribute("tabindex", "0");
    else
      listElem.setAttribute("tabindex", "-1");
  }

  /**
   * Create list element from template
   * @param {JSON} itemObj
   * @param {Template} template
   * @return {Node} node
   */
  _itemFromTmpl(itemObj, template)
  {
    const tmpContent = template.cloneNode(true);

    this._updateListElem(itemObj, tmpContent);
    return tmpContent;
  }

  /**
   * Empty list or sublist
   * @param {String} id item ID, if specified all subitems are
   *                          emptied(optional)
   */
  empty(id)
  {
    if (id)
    {
      const item = this.getItem(id, null, false);
      const element = this.getItemElem(id);
      if (item)
        delete item.subItems;
      if (element)
        element.removeChild(element.querySelector("ul"));
    }
    else
    {
      this.items = [];
      this.listElem.innerHTML = "";
      this.loaded = 0;
    }
  }

  /**
   * Get the index (position) of the item
   * @param {String} id
   * @param {String} parentId used for getting subItems
   * @return {Number} index of the item or -1 if can't find
   */
  getItemIndex(id, parentId)
  {
    let items = this.items;
    if (parentId)
    {
      const item = this.getItem(parentId, null, false);
      if (item && item.subItems)
        items = item.subItems;
      else
        return -1
    }

    if (!items)
      return -1;

    for (let i = 0; i < items.length; i++)
      if (items[i].id === id)
        return i;
    return -1;
  }

  /**
   * Getting the DOM Element that corresponds to the item using id
   * @param {String} id main item ID
   * @param {String} parentId used for getting subItems
   * @return {Node} DOM Element
   */
  getItemElem(id, parentId)
  {
    const index = this.getItemIndex(id, parentId);
    if (index === -1)
      return null;
    let parentElem = this.listElem;
    if (parentId)
    {
      const parentIndex = this.getItemIndex(parentId);
      parentElem = parentElem.children[parentIndex].querySelector("ul");
    }
    return parentElem.children[index];
  }

  /**
   * Getting the item
   * @param {String}  id main item ID
   * @param {String}  parentId used for getting subItems
   * @param {Boolean} _deepCopy if false returns shallow copy (default: true)
   * @return {JSON}   object of the item or null if can't find
   */
  getItem(id, parentId, _deepCopy = true)
  {
    const index = this.getItemIndex(id, parentId);
    if (index === -1)
      return null;
    let items = this.items;
    if (parentId)
      items = items[this.getItemIndex(parentId)].subItems;
    const item = items[index];
    if (_deepCopy)
      return deepCopy(item);

    return item;
  }

  /**
   * Update the item and DOM
   * @param {JSON}    newItemObj
   * @param {String}  id ID of the main Item
   * @param {String}  parentId used for updating subitems
   * @param {Boolean} _deepCopy uses shallow copy when false (default: true)
   */
  updateItem(newItemObj, id, parentId, _deepCopy=true)
  {
    const itemCopy = _deepCopy ? deepCopy(newItemObj) : newItemObj;
    const itemElem = this.getItemElem(id, parentId);
    const wasFocused = itemElem ?
                       itemElem.isSameNode(this._getActiveElement()) : false;
    this.removeItem(id, parentId);
    this.addItems([itemCopy], parentId);
    if (wasFocused)
      this.selectItem(itemCopy.id, parentId);
  }

  /**
   * Deprecated
   * Reverse focus first or last list item
   * @param {Node} parentElement list item parent element
   * @param {Boolean} isFirst focus first if true otherwise last element
   */
  focusEdgeElem(parentElement, isFirst)
  {
    //TODO: use utils method instead 
    let childElem = isFirst ? parentElement.firstChild : parentElement.lastChild;
    while(childElem != null && childElem.nodeType == 3)
      childElem = isFirst ? childElem.nextSibling : childElem.previousSibling;

    if (childElem)
      childElem.focus();
  }

  _getActiveElement()
  {
    return this.shadowRoot.activeElement;
  }

  /**
   * Managing focus of the element, can select item by ID or switch selection
   * @param {String} id Item
   * @param {String} parentId used for accessing sub item
   * @param {String} type possible values "next", "previous", "end", "start"
   */
  selectItem(id, parentId, type)
  {
    const relativeElement = this.getItemElem(id, parentId);
    const parentItemElement = this.getItemElem(parentId);
    const isEdgeRequest = type === "start" || type === "end";
    if (!relativeElement && !isEdgeRequest)
      return;

    if (!type && relativeElement)
    {
      relativeElement.focus();
      return;
    }
    switch (type)
    {
      case "next":
        const nextElem = relativeElement.nextElementSibling;
        if (!nextElem)
          this.selectItem(id, parentId, "start");
        else
          nextElem.focus();
        break;
      case "previous":
        const previousElem = relativeElement.previousElementSibling;
        if (!previousElem)
          this.selectItem(id, parentId, "end");
        else
          previousElem.focus();
        break;
      case "start":
        if (parentItemElement)
          parentItemElement.querySelector("ul").firstElementChild.focus();
        else
          this.listElem.firstElementChild.focus();
        break;
      case "end":
        if (parentItemElement)
          parentItemElement.querySelector("ul").lastElementChild.focus();
        else
          this.listElem.lastElementChild.focus();
        break;
    }
  }

  /**
   * Get parent element id
   * @param  {Node} element DOM Node child of table list item
   * @return {String} id or null if can't find
   */
  _getParentItemElemId(element)
  {
    while(element)
    {
      element = element.parentElement;
      if (element && element.tagName === "LI" && element.dataset.id)
      {
        return element.dataset.id;
      }
    }
    return null;
  }

  /**
   * Action listener
   * @param {String} action
   * @param {Node} element target
   */
  _onAction(action, element)
  {
    switch (action)
    {
      case "next-sibling":
        this.selectItem(element.dataset.id, this._getParentItemElemId(element), "next");
        break;
      case "previouse-sibling":
        this.selectItem(element.dataset.id, this._getParentItemElemId(element), "previous");
        break;
    }
  }
}

customElements.define('table-list', TableList);