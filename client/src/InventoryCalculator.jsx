import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import * as XLSX from "xlsx";
import "./InventoryCalculator.css";

const TableRow = React.memo(
  ({
    item,
    index,
    globalIndex,
    newPriceInputs,
    onPriceInputChange,
    onConfirmPriceChange,
    onCopyToClipboard,
    onShowComments,
    onToggleCategory,
    onIsInCategory,
    onShowPriceHistory,
    onUpdateCommission,
    getRowColors,
    getGradientColor,
    showTableName = false,
    tableName = "",
    isGlobalView = false,
    isSelected = false,
    onRowClick,
    isExpanded = false,
    onTogglePriceExpansion,
    isInfoExpanded = false,
    onToggleInfoExpansion,
    expandedInfoTables = {},
    onToggleInfoTable,
    getItemDataFromOtherTables,
    currentTableId = null,
    isFromOtherTable = false,
    sourceTableName = "",
    isCategoriesExpanded = false,
    onToggleCategoriesExpansion,
  }) => {
    const hasChangedPrice = item.priceHistory && item.priceHistory.length > 0;
    const hasComments = item.comments && item.comments.length > 0;
    const rowColors = getRowColors(item);

    const getRowClassName = () => {
      let className = "table-row";
      if (isSelected) className += " table-row--selected";
      if (rowColors.backgroundColor === "#4a2c4a")
        className += " table-row--price-and-comment";
      else if (rowColors.backgroundColor === "#2c4a2c")
        className += " table-row--price-only";
      else if (rowColors.backgroundColor === "#1a2f3a")
        className += " table-row--comment-only";
      else if (rowColors.backgroundColor === "#1a4a1a")
        className += " table-row--new";
      else if (rowColors.backgroundColor === "#4a4a1a")
        className += " table-row--optimization";
      else if (rowColors.backgroundColor === "#1a1a4a")
        className += " table-row--ab";
      else if (rowColors.backgroundColor === "#4a1a4a")
        className += " table-row--c-sale";
      else if (rowColors.backgroundColor === "#4a3a1a")
        className += " table-row--off-season";
      else if (rowColors.backgroundColor === "#3a1a1a")
        className += " table-row--unprofitable";
      else if (rowColors.backgroundColor === "#4a2c2c")
        className += " table-row--crm-zero";
      else if (rowColors.backgroundColor === "#4a3d2c")
        className += " table-row--crm-low";
      else className += " table-row--transparent";
      return className;
    };

    const getItemIdClassName = () => {
      if (hasChangedPrice && hasComments)
        return "item-id item-id--price-and-comment";
      if (hasChangedPrice) return "item-id item-id--price-only";
      if (hasComments) return "item-id item-id--comment-only";
      return "item-id item-id--default";
    };

    const getIndicatorStarClassName = () => {
      if (hasChangedPrice && hasComments)
        return "indicator-star indicator-star--purple";
      if (hasChangedPrice) return "indicator-star indicator-star--green";
      return "indicator-star indicator-star--blue";
    };

    return (
      <>
        <tr className={getRowClassName()} onClick={() => onRowClick(item.id)}>
          <td className="table-cell table-cell--center">
            {globalIndex + 1}
            {(hasChangedPrice || hasComments) && (
              <span className={getIndicatorStarClassName()}>★</span>
            )}
          </td>
          <td className="table-cell">
            <div>
              <div className="cell-content">
                <span
                  className={getItemIdClassName()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyToClipboard(item.id);
                  }}
                >
                  {item.id}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyToClipboard(item.id);
                  }}
                  className="mini-button mini-button--copy"
                >
                  Copy
                </button>
              </div>
              {showTableName && !isGlobalView && (
                <div className="table-name-info">
                  <div
                    className={`table-name-content ${
                      item.lastChangeTableName
                        ? "table-name-content--price"
                        : item.lastCommentTableName
                        ? "table-name-content--comment"
                        : "table-name-content--default"
                    }`}
                  >
                    <span className="table-name-badge">
                      {item.lastChangeTableName
                        ? "📈"
                        : item.lastCommentTableName
                        ? "💬"
                        : "📋"}
                    </span>
                    {item.lastChangeTableName ||
                      item.lastCommentTableName ||
                      item.primaryTableName ||
                      tableName}
                    {item.lastChangeTableName && " (последнее изменение цены)"}
                    {item.lastCommentTableName && " (последний комментарий)"}
                  </div>
                </div>
              )}
              <div className="cell-buttons">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCategoriesExpansion(item.id);
                  }}
                  className="mini-button mini-button--category"
                >
                  {isCategoriesExpanded ? "▲" : "▼"} Категории
                </button>

                {/* Активные категории - всегда видны */}
                {onIsInCategory(item.id, "new") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCategory(item.id, "new");
                    }}
                    className="mini-button mini-button--new active"
                  >
                    Новый
                  </button>
                )}
                {onIsInCategory(item.id, "optimization") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCategory(item.id, "optimization");
                    }}
                    className="mini-button mini-button--optimization active"
                  >
                    Оптим
                  </button>
                )}
                {onIsInCategory(item.id, "ab") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCategory(item.id, "ab");
                    }}
                    className="mini-button mini-button--ab active"
                  >
                    A/B
                  </button>
                )}
                {onIsInCategory(item.id, "c_sale") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCategory(item.id, "c_sale");
                    }}
                    className="mini-button mini-button--c-sale active"
                  >
                    С-Прод
                  </button>
                )}
                {onIsInCategory(item.id, "off_season") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCategory(item.id, "off_season");
                    }}
                    className="mini-button mini-button--off-season active"
                  >
                    Несез
                  </button>
                )}
                {onIsInCategory(item.id, "unprofitable") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCategory(item.id, "unprofitable");
                    }}
                    className="mini-button mini-button--unprofitable active"
                  >
                    Нерент
                  </button>
                )}

                {/* Неактивные категории - только в раскрытом меню */}
                {isCategoriesExpanded && (
                  <>
                    {!onIsInCategory(item.id, "new") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCategory(item.id, "new");
                        }}
                        className="mini-button mini-button--new"
                      >
                        Новый
                      </button>
                    )}
                    {!onIsInCategory(item.id, "optimization") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCategory(item.id, "optimization");
                        }}
                        className="mini-button mini-button--optimization"
                      >
                        Оптим
                      </button>
                    )}
                    {!onIsInCategory(item.id, "ab") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCategory(item.id, "ab");
                        }}
                        className="mini-button mini-button--ab"
                      >
                        A/B
                      </button>
                    )}
                    {!onIsInCategory(item.id, "c_sale") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCategory(item.id, "c_sale");
                        }}
                        className="mini-button mini-button--c-sale"
                      >
                        С-Прод
                      </button>
                    )}
                    {!onIsInCategory(item.id, "off_season") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCategory(item.id, "off_season");
                        }}
                        className="mini-button mini-button--off-season"
                      >
                        Несез
                      </button>
                    )}
                    {!onIsInCategory(item.id, "unprofitable") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCategory(item.id, "unprofitable");
                        }}
                        className="mini-button mini-button--unprofitable"
                      >
                        Нерент
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowComments(item);
                  }}
                  className={`mini-button mini-button--comment ${
                    hasComments
                      ? "mini-button--comment-active"
                      : "mini-button--comment-inactive"
                  }`}
                >
                  💬{hasComments ? item.comments.length : "+"}
                </button>
              </div>
            </div>
          </td>
          <td className="table-cell table-cell--cost">
            {(item.baseCost || 0).toFixed(2)}
          </td>
          <td className="table-cell">{item.stock || 0}</td>
          <td className="table-cell">{item.daysStock || 0}</td>
          <td className="table-cell">{item.salesMonth || 0}</td>
          <td className="table-cell">{item.sales2Weeks || 0}</td>
          <td className="table-cell">
            {item.applicationsMonth !== null
              ? item.applicationsMonth || 0
              : "—"}
          </td>
          <td className="table-cell">
            {item.applications2Weeks !== null
              ? item.applications2Weeks || 0
              : "—"}
          </td>
          <td className="table-cell" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              value={item.commission || 0}
              onChange={(e) => onUpdateCommission(item.id, e.target.value)}
              className="commission-input"
            />
          </td>
          <td className="table-cell table-cell--total">
            {(item.totalCost || 0).toFixed(2)}
          </td>
          <td className="table-cell table-cell--crm-stock">
            {item.crmStock !== null && item.crmStock !== undefined
              ? item.crmStock
              : "—"}
          </td>
          <td className="table-cell table-cell--crm-price">
            {item.crmPrice
              ? (typeof item.crmPrice === "object"
                  ? item.crmPrice.price
                  : item.crmPrice
                ).toFixed(2)
              : "—"}
          </td>
          <td className="table-cell table-cell--prom-price">
            {item.promPrice ? item.promPrice.toFixed(2) : "—"}
          </td>
          <td className="table-cell" onClick={(e) => e.stopPropagation()}>
            <div className="price-inputs">
              <input
                type="number"
                step="0.01"
                placeholder="Цена"
                value={newPriceInputs[item.id] || ""}
                onChange={(e) => onPriceInputChange(item.id, e.target.value)}
                className="price-input"
              />
              <button
                onClick={() => onConfirmPriceChange(item.id)}
                disabled={
                  !newPriceInputs[item.id] ||
                  isNaN(parseFloat(newPriceInputs[item.id]))
                }
                className={`price-confirm ${
                  !newPriceInputs[item.id] ||
                  isNaN(parseFloat(newPriceInputs[item.id]))
                    ? "price-confirm--disabled"
                    : "price-confirm--enabled"
                }`}
              >
                ✓
              </button>
            </div>
            {item.priceHistory && item.priceHistory.length > 0 && (
              <div className="price-history">
                <div className="price-history-current">
                  Последняя:{" "}
                  {(
                    item.priceHistory[item.priceHistory.length - 1].price || 0
                  ).toFixed(2)}{" "}
                  ₴
                </div>
                <div className="price-history-date">
                  {new Date(
                    item.priceHistory[item.priceHistory.length - 1].date
                  ).toLocaleDateString()}
                </div>
                {item.priceHistory.length > 1 && (
                  <div
                    className="price-history-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowPriceHistory(item);
                    }}
                  >
                    История: {item.priceHistory.length} изм.
                  </div>
                )}
              </div>
            )}
          </td>
          <td className="table-cell" onClick={(e) => e.stopPropagation()}>
            {isFromOtherTable ? (
              <div className="other-table-indicator">
                <span className="other-table-name">{sourceTableName}</span>
              </div>
            ) : (
              <div className="info-price-buttons">
                <button
                  onClick={() => onTogglePriceExpansion(item.id)}
                  className="mini-button mini-button--actions"
                >
                  {isExpanded ? "▲" : "▼"} Цены
                </button>
                <button
                  onClick={() => onToggleInfoExpansion(item.id)}
                  className="mini-button mini-button--info"
                >
                  {isInfoExpanded ? "▲" : "▼"} Инфо
                </button>
              </div>
            )}
          </td>
        </tr>
        {isExpanded && (
          <tr className="price-expansion">
            <td colSpan="16" className="price-expansion-cell">
              <div className="price-grid">
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((percent) => (
                  <div
                    key={percent}
                    className="price-item"
                    style={{ borderColor: getGradientColor(percent) }}
                  >
                    <div
                      className="price-percent"
                      style={{ color: getGradientColor(percent) }}
                    >
                      +{percent}%
                    </div>
                    <div className="price-value">
                      {(item[`markup${percent}`] || 0).toFixed(2)} ₴
                    </div>
                  </div>
                ))}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  }
);

const InventoryCalculator = () => {
  const [currentSection, setCurrentSection] = useState("home");
  const [tables, setTables] = useState([]);
  const [activeTableId, setActiveTableId] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPriceHistory, setShowPriceHistory] = useState(null);
  const [newPriceInputs, setNewPriceInputs] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showComments, setShowComments] = useState(null);
  const [newCommentInput, setNewCommentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingTable, setIsDeletingTable] = useState(null);
  const [availableCrmCategories, setAvailableCrmCategories] = useState([]);
  const [tableXmlData, setTableXmlData] = useState({}); // Отдельные XML данные для каждой таблицы
  const [tableXmlLoadingStatus, setTableXmlLoadingStatus] = useState({}); // Статусы загрузки для каждой таблицы

  // Новые состояния для глобальных XML данных
  const [globalCrmData, setGlobalCrmData] = useState({});
  const [globalPromData, setGlobalPromData] = useState({});
  const [globalXmlLoadingStatus, setGlobalXmlLoadingStatus] = useState({
    crm: "not_loaded",
    prom: "not_loaded",
  });

  // Состояния для отслеживания времени последнего обновления и количества позиций (отдельно для каждой таблицы)
  const [xmlLastUpdate, setXmlLastUpdate] = useState({});
  const [xmlDataCounts, setXmlDataCounts] = useState({}); // Новое состояние для количества позиций

  // Состояние для отслеживания загрузки данных отдельных таблиц (lazy loading)
  const [tableDataLoadingStatus, setTableDataLoadingStatus] = useState({});

  // Глобальные фильтры для спецальных представлений
  const [globalViewFilters, setGlobalViewFilters] = useState({
    currentPage: 1,
    itemsPerPage: 100,
    searchId: "",
    sortConfig: { key: null, direction: "asc" },
    showOnlyProm: false,
    hideCrmStockZero: false,
    hideCrmStockLowSix: false,
    rangeFilters: {
      baseCost: { min: "", max: "" },
      lastPrice: { min: "", max: "" },
      crmStock: { min: "", max: "" },
      crmPrice: { min: "", max: "" },
      promPrice: { min: "", max: "" },
    },
    dateFilter: { from: "", to: "" },
    dateCommentFilter: { from: "", to: "" },
  });

  // Глобальное хранилище изменений по ID товаров
  const [globalItemChanges, setGlobalItemChanges] = useState({});

  const [globalCategories, setGlobalCategories] = useState({
    new: new Map(),
    optimization: new Map(),
    ab: new Map(),
    c_sale: new Map(),
    off_season: new Map(),
    unprofitable: new Map(),
  });

  // Глобальное хранилище комиссий для всех товаров по ID
  const [globalCommissions, setGlobalCommissions] = useState({});

  // Состояние для выделенной строки
  const [selectedItemId, setSelectedItemId] = useState(null);

  // Состояние для раскрывающихся градаций цен
  const [expandedPriceRows, setExpandedPriceRows] = useState(new Set());
  const [expandedInfoRows, setExpandedInfoRows] = useState(new Set()); // Какие ID имеют раскрытое инфо меню
  const [expandedInfoTables, setExpandedInfoTables] = useState({}); // Какие таблицы раскрыты для каждого ID: {itemId: Set([tableId1, tableId2])}
  const [expandedCategoriesRows, setExpandedCategoriesRows] = useState(
    new Set()
  ); // Какие ID имеют раскрытое меню категорий

  // Состояние для раскрывающихся CRM категорий
  const [isCrmCategoriesExpanded, setIsCrmCategoriesExpanded] = useState(false);

  // НОВЫЕ СОСТОЯНИЯ ДЛЯ АВТОСОХРАНЕНИЯ
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");
  const tableContainerRef = useRef(null);

  const CRM_XML_URL =
    "https://senik.salesdrive.me/export/yml/export.yml?publicKey=i_zPLWs83z704rgGJU-ERC2yhOdPcwNQI8OBNyWIhU0HhgJFYtEBveFq9TtiDuFq5ww3BFZdt7";
  const PROM_XML_URL =
    "https://everyday-market.net/products_feed.xml?hash_tag=41ed1def2e56cdb7b65404a8c68c938d&sales_notes=stock&product_ids=&label_ids=&exclude_fields=description&html_description=0&yandex_cpa=&process_presence_sure=&languages=uk&extra_fields=quantityInStock&group_ids=";

  // Функции управления уведомлениями
  const addNotification = useCallback((message, type = "primary") => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type };

    setNotifications((prev) => [...prev, notification]);

    // Автоматически удаляем уведомление через 3-5 секунд в зависимости от типа
    const timeout = type === "success" ? 3000 : type === "info" ? 4000 : 5000;
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, timeout);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // API функции для работы с категориями
  const loadCategoriesFromServer = useCallback(async () => {
    try {
      console.log("📥 Загрузка категорий с сервера...");
      const response = await fetch("/api/categories");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        "📦 Получены категории с сервера:",
        Object.keys(data.categories)
      );

      // Конвертируем данные в Map для React состояния
      const categoriesState = {};
      Object.keys(data.categories).forEach((categoryType) => {
        const categoryMap = new Map();
        const categoryData = data.categories[categoryType] || [];

        // Поддерживаем старый формат (массив ID) и новый формат (объекты)
        if (Array.isArray(categoryData)) {
          categoryData.forEach((item) => {
            if (typeof item === "string") {
              // Старый формат - просто ID
              categoryMap.set(item, { addedDate: new Date().toISOString() });
            } else if (typeof item === "object" && item.id) {
              // Новый формат - объект с ID и датой
              categoryMap.set(item.id, {
                addedDate: item.addedDate || new Date().toISOString(),
              });
            }
          });
        }

        categoriesState[categoryType] = categoryMap;
      });

      setGlobalCategories(categoriesState);
      console.log("✅ Категории успешно загружены!");

      return data.categories;
    } catch (error) {
      console.error("❌ Ошибка загрузки категорий:", error);
      throw error;
    }
  }, []);

  const saveCategoryToServer = useCallback(async (categoryType, items) => {
    try {
      console.log(
        `💾 Сохранение категории "${categoryType}": ${items.length} позиций`
      );
      const response = await fetch(`/api/categories/${categoryType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Категория "${categoryType}" сохранена на сервере`);

      return result;
    } catch (error) {
      console.error(`❌ Ошибка сохранения категории "${categoryType}":`, error);
      throw error;
    }
  }, []);

  const toggleItemInCategory = useCallback(
    async (itemId, categoryType) => {
      try {
        const normalizedId = normalizeId(itemId);
        const isCurrentlyInCategory =
          globalCategories[categoryType]?.has(normalizedId);

        if (isCurrentlyInCategory) {
          // Удаляем из категории
          const response = await fetch(
            `/api/categories/${categoryType}/items/${encodeURIComponent(
              normalizedId
            )}`,
            {
              method: "DELETE",
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Обновляем локальное состояние
          setGlobalCategories((prev) => {
            const newCategories = { ...prev };
            const categoryMap = new Map(newCategories[categoryType]);
            categoryMap.delete(normalizedId);
            newCategories[categoryType] = categoryMap;
            return newCategories;
          });
        } else {
          // Добавляем в категорию
          const response = await fetch(
            `/api/categories/${categoryType}/items/${encodeURIComponent(
              normalizedId
            )}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                addedDate: new Date().toISOString(),
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Обновляем локальное состояние
          setGlobalCategories((prev) => {
            const newCategories = { ...prev };
            const categoryMap = new Map(newCategories[categoryType]);
            categoryMap.set(normalizedId, {
              addedDate: new Date().toISOString(),
            });
            newCategories[categoryType] = categoryMap;
            return newCategories;
          });
        }

        const categoryNames = {
          new: "Новый",
          optimization: "Оптимизация",
          ab: "A/B",
          c_sale: "С-Продажа",
          off_season: "Несезон",
          unprofitable: "Нерентабельные",
        };

        addNotification(
          `${isCurrentlyInCategory ? "Удалено из" : "Добавлено в"} "${
            categoryNames[categoryType]
          }": ${itemId}`,
          isCurrentlyInCategory ? "info" : "success"
        );
      } catch (error) {
        console.error(
          `❌ Ошибка переключения категории "${categoryType}":`,
          error
        );
        addNotification(`❌ Ошибка: ${error.message}`);
      }
    },
    [globalCategories, addNotification]
  );

  const activeTable = tables.find((table) => table.id === activeTableId);
  const data = useMemo(
    () => (activeTable ? activeTable.data : []),
    [activeTable]
  );

  const scrollToTable = useCallback(() => {
    if (tableContainerRef.current) {
      // Сбрасываем прокрутку внутри самой таблицы
      tableContainerRef.current.scrollTop = 0;

      // Также прокручиваем страницу к таблице
      const navigationHeight =
        document.querySelector(".navigation")?.offsetHeight || 0;
      const offsetTop =
        tableContainerRef.current.offsetTop - navigationHeight - 20;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
  }, []);

  const resetTableScrollAndScrollToTable = useCallback(() => {
    if (tableContainerRef.current) {
      // Сначала сбрасываем прокрутку внутри таблицы
      tableContainerRef.current.scrollTop = 0;

      // Затем прокручиваем страницу к таблице
      const navigationHeight =
        document.querySelector(".navigation")?.offsetHeight || 0;
      const offsetTop =
        tableContainerRef.current.offsetTop - navigationHeight - 20;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
  }, []);

  const resetTableScrollOnly = useCallback(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, []);

  const updateGlobalFiltersWithScroll = useCallback(
    (updates, isManualPageChange = false) => {
      setGlobalViewFilters((prev) => ({ ...prev, ...updates }));

      // Если это ручной переход между страницами - полный скролл
      if (isManualPageChange && updates.currentPage) {
        resetTableScrollAndScrollToTable();
      }
      // Если это фильтры/поиск - только сброс внутренней прокрутки
      else if (
        updates.currentPage === 1 ||
        Object.keys(updates).some((key) => key !== "currentPage")
      ) {
        resetTableScrollOnly();
      }
    },
    [resetTableScrollAndScrollToTable, resetTableScrollOnly]
  );

  // API функции для работы с сервером
  const saveDataToServer = useCallback(async () => {
    try {
      setSaveStatus("saving");

      // Очищаем данные от возможных циклических ссылок и некорректных значений
      const cleanGlobalCrmData = {};
      const cleanGlobalPromData = {};

      // Очищаем globalCrmData
      if (globalCrmData && typeof globalCrmData === "object") {
        Object.keys(globalCrmData).forEach((key) => {
          const value = globalCrmData[key];
          if (value && typeof value === "object") {
            cleanGlobalCrmData[key] = {
              price: typeof value.price === "number" ? value.price : null,
              stock: typeof value.stock === "number" ? value.stock : null,
              categoryId:
                typeof value.categoryId === "string" ? value.categoryId : null,
              categoryName:
                typeof value.categoryName === "string"
                  ? value.categoryName
                  : null,
            };
          } else if (typeof value === "number") {
            cleanGlobalCrmData[key] = value;
          }
        });
      }

      // Очищаем globalPromData
      if (globalPromData && typeof globalPromData === "object") {
        Object.keys(globalPromData).forEach((key) => {
          const value = globalPromData[key];
          if (typeof value === "number") {
            cleanGlobalPromData[key] = value;
          }
        });
      }

      // Очищаем tableXmlData
      const cleanTableXmlData = {};
      if (tableXmlData && typeof tableXmlData === "object") {
        Object.keys(tableXmlData).forEach((tableId) => {
          const tableData = tableXmlData[tableId];
          if (tableData && typeof tableData === "object") {
            cleanTableXmlData[tableId] = {
              crm:
                tableData.crm && typeof tableData.crm === "object"
                  ? tableData.crm
                  : {},
              prom:
                tableData.prom && typeof tableData.prom === "object"
                  ? tableData.prom
                  : {},
              categories: Array.isArray(tableData.categories)
                ? tableData.categories
                : [],
            };
          }
        });
      }

      const dataToSave = {
        tables: Array.isArray(tables) ? tables : [],
        globalCommissions: globalCommissions || {},
        globalItemChanges: globalItemChanges || {},
        xmlLastUpdate: xmlLastUpdate || {},
        availableCrmCategories: Array.isArray(availableCrmCategories)
          ? availableCrmCategories
          : [],
        tableXmlData: cleanTableXmlData,
        tableXmlLoadingStatus: tableXmlLoadingStatus || {},
        globalCrmData: cleanGlobalCrmData,
        globalPromData: cleanGlobalPromData,
        globalXmlLoadingStatus: globalXmlLoadingStatus || {
          crm: "not_loaded",
          prom: "not_loaded",
        },
      };

      // Проверяем корректность данных перед отправкой
      console.log("📤 Подготовка данных для сохранения:");
      console.log("  - Таблиц:", dataToSave.tables.length);
      console.log(
        "  - Комиссий:",
        Object.keys(dataToSave.globalCommissions).length
      );
      console.log(
        "  - Глобальных CRM:",
        Object.keys(dataToSave.globalCrmData).length
      );
      console.log(
        "  - Глобальных PROM:",
        Object.keys(dataToSave.globalPromData).length
      );
      console.log("  - Статус загрузки:", dataToSave.globalXmlLoadingStatus);

      const response = await fetch("/api/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setLastSaveTime(new Date());
      setSaveStatus("saved");

      return result;
    } catch (error) {
      console.error("Ошибка сохранения на сервер:", error);
      setSaveStatus("error");
      throw error;
    }
  }, [
    tables,
    globalCommissions,
    globalItemChanges,
    xmlLastUpdate,
    xmlDataCounts,
    availableCrmCategories,
    tableXmlData,
    tableXmlLoadingStatus,
    globalCrmData,
    globalPromData,
    globalXmlLoadingStatus,
  ]);

  const loadDataFromServer = useCallback(async () => {
    try {
      console.log("📥 Загрузка сохраненных данных...");
      const response = await fetch("/api/data");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📦 Получены данные с сервера:", Object.keys(data));

      if (data.tables && Array.isArray(data.tables) && data.tables.length > 0) {
        console.log(`📋 Восстанавливаем ${data.tables.length} таблиц`);
        setTables(data.tables);
        setActiveTableId(data.tables[0].id);
        setCurrentSection("table");
        console.log(`✅ Активная таблица: ${data.tables[0].name}`);
      }

      if (
        data.globalCommissions &&
        Object.keys(data.globalCommissions).length > 0
      ) {
        console.log(
          `💼 Восстанавливаем ${
            Object.keys(data.globalCommissions).length
          } комиссий`
        );
        setGlobalCommissions(data.globalCommissions);
      }

      if (
        data.globalItemChanges &&
        Object.keys(data.globalItemChanges).length > 0
      ) {
        console.log(
          `🔄 Восстанавливаем изменения ${
            Object.keys(data.globalItemChanges).length
          } товаров`
        );
        setGlobalItemChanges(data.globalItemChanges);
      }

      if (data.xmlLastUpdate) {
        setXmlLastUpdate(data.xmlLastUpdate);
      }

      if (data.xmlDataCounts) {
        setXmlDataCounts(data.xmlDataCounts);
      }

      if (data.globalXmlLoadingStatus) {
        setGlobalXmlLoadingStatus(data.globalXmlLoadingStatus);
        console.log(
          `✅ Восстановлен статус глобальных XML: CRM=${data.globalXmlLoadingStatus.crm}, PROM=${data.globalXmlLoadingStatus.prom}`
        );
      } else {
        // Если статус не сохранен, но данные есть - устанавливаем статус как loaded
        const hasGlobalCrmData =
          data.globalCrmData && Object.keys(data.globalCrmData).length > 0;
        const hasGlobalPromData =
          data.globalPromData && Object.keys(data.globalPromData).length > 0;

        if (hasGlobalCrmData || hasGlobalPromData) {
          const autoStatus = {
            crm: hasGlobalCrmData ? "loaded" : "not_loaded",
            prom: hasGlobalPromData ? "loaded" : "not_loaded",
          };
          setGlobalXmlLoadingStatus(autoStatus);
          console.log(
            `🔄 Автоматически установлен статус XML: CRM=${autoStatus.crm}, PROM=${autoStatus.prom}`
          );
        }
      }

      if (data.globalXmlLoadingStatus) {
        setGlobalXmlLoadingStatus(data.globalXmlLoadingStatus);
        console.log(
          `✅ Восстановлен статус глобальных XML: CRM=${data.globalXmlLoadingStatus.crm}, PROM=${data.globalXmlLoadingStatus.prom}`
        );
      }

      if (
        data.availableCrmCategories &&
        Array.isArray(data.availableCrmCategories)
      ) {
        console.log(
          `📋 Восстанавливаем ${data.availableCrmCategories.length} CRM категорий`
        );
        setAvailableCrmCategories(data.availableCrmCategories);
      }
      if (data.tableXmlData && Object.keys(data.tableXmlData).length > 0) {
        console.log(
          `📋 Восстанавливаем XML данные таблиц: ${
            Object.keys(data.tableXmlData).length
          } таблиц`
        );
        setTableXmlData(data.tableXmlData);
      }

      if (
        data.tableXmlLoadingStatus &&
        Object.keys(data.tableXmlLoadingStatus).length > 0
      ) {
        console.log(`📋 Восстанавливаем статусы загрузки XML таблиц`);
        setTableXmlLoadingStatus(data.tableXmlLoadingStatus);
      }
      if (data.globalCrmData && Object.keys(data.globalCrmData).length > 0) {
        console.log(
          `🌐 Восстанавливаем глобальные CRM данные: ${
            Object.keys(data.globalCrmData).length
          } позиций`
        );
        setGlobalCrmData(data.globalCrmData);
      }

      // Устанавливаем статус загрузки для глобальных данных
      if (
        (data.globalCrmData && Object.keys(data.globalCrmData).length > 0) ||
        (data.globalPromData && Object.keys(data.globalPromData).length > 0)
      ) {
        setGlobalXmlLoadingStatus({
          crm:
            data.globalCrmData && Object.keys(data.globalCrmData).length > 0
              ? "loaded"
              : "not_loaded",
          prom:
            data.globalPromData && Object.keys(data.globalPromData).length > 0
              ? "loaded"
              : "not_loaded",
        });
        console.log(
          `✅ Статус глобальных XML данных установлен: CRM=${
            data.globalCrmData && Object.keys(data.globalCrmData).length > 0
              ? "loaded"
              : "not_loaded"
          }, PROM=${
            data.globalPromData && Object.keys(data.globalPromData).length > 0
              ? "loaded"
              : "not_loaded"
          }`
        );
      }

      if (data.globalPromData && Object.keys(data.globalPromData).length > 0) {
        console.log(
          `🌐 Восстанавливаем глобальные PROM данные: ${
            Object.keys(data.globalPromData).length
          } позиций`
        );
        setGlobalPromData(data.globalPromData);
      }

      setIsDataLoaded(true);

      if (data.lastSaved) {
        setLastSaveTime(new Date(data.lastSaved));
      }

      console.log("✅ Все данные успешно восстановлены!");

      return data;
    } catch (error) {
      console.error("❌ Ошибка загрузки данных:", error);
      setIsDataLoaded(true);
      throw error;
    }
  }, []);

  // Загрузка данных конкретной таблицы (lazy loading)
  const loadTableData = useCallback(async (tableId) => {
    if (!tableId) return;

    // Проверяем, не загружена ли уже таблица
    const currentTable = tables.find(t => t.id === tableId);
    if (currentTable && currentTable.data && currentTable.data.length > 0) {
      console.log(`✅ Таблица ${tableId} уже загружена, пропускаем`);
      return;
    }

    // Проверяем, не загружается ли уже
    if (tableDataLoadingStatus[tableId] === 'loading') {
      console.log(`⏳ Таблица ${tableId} уже загружается, пропускаем`);
      return;
    }

    try {
      console.log(`📥 Загрузка данных таблицы: ${tableId}`);
      setTableDataLoadingStatus(prev => ({ ...prev, [tableId]: 'loading' }));

      const response = await fetch(`/api/tables/${tableId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tableData = await response.json();
      console.log(`📦 Получены данные таблицы ${tableId}: ${tableData.data?.length || 0} позиций`);

      // Обновляем таблицу в state
      setTables(prevTables =>
        prevTables.map(table =>
          table.id === tableId
            ? { ...table, data: tableData.data || [] }
            : table
        )
      );

      setTableDataLoadingStatus(prev => ({ ...prev, [tableId]: 'loaded' }));
      console.log(`✅ Таблица ${tableId} успешно загружена`);

    } catch (error) {
      console.error(`❌ Ошибка загрузки таблицы ${tableId}:`, error);
      setTableDataLoadingStatus(prev => ({ ...prev, [tableId]: 'error' }));
      addNotification(`⚠️ Не удалось загрузить данные таблицы`);
    }
  }, [tables, tableDataLoadingStatus, addNotification]);

  // Загрузка данных при запуске приложения
  useEffect(() => {
    if (!isDataLoaded) {
      // Загружаем основные данные
      loadDataFromServer().catch((error) => {
        console.error("❌ Не удалось загрузить сохраненные данные:", error);
        addNotification("⚠️ Работаем без сохраненных данных (ошибка загрузки)");
      });

      // Загружаем категории
      loadCategoriesFromServer().catch((error) => {
        console.error("❌ Не удалось загрузить категории:", error);
        addNotification("⚠️ Категории не загружены (ошибка загрузки)");
      });
    }
  }, [
    isDataLoaded,
    loadDataFromServer,
    loadCategoriesFromServer,
    addNotification,
  ]);

  // МГНОВЕННОЕ автосохранение при изменении данных
  // МГНОВЕННОЕ автосохранение при изменении данных
  useEffect(() => {
    if (!isDataLoaded) return;

    const saveTimeout = setTimeout(() => {
      console.log("🚀 Мгновенное сохранение данных...");
      saveDataToServer().catch((error) => {
        console.error("Автосохранение не удалось:", error);
      });
    }, 100);

    return () => clearTimeout(saveTimeout);
  }, [
    tables,
    globalCommissions,
    globalItemChanges,
    xmlLastUpdate,
    xmlDataCounts,
    availableCrmCategories,
    tableXmlData,
    tableXmlLoadingStatus,
    globalCrmData,
    globalPromData,
    globalXmlLoadingStatus,
    isDataLoaded,
    saveDataToServer,
  ]);

  // Принудительное сохранение при закрытии страницы
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (saveStatus === "saving") {
        event.preventDefault();
        event.returnValue = "Данные еще сохраняются...";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveStatus]);

  // Автоматическая загрузка данных таблицы при переключении activeTableId
  useEffect(() => {
    if (activeTableId && isDataLoaded) {
      loadTableData(activeTableId);
    }
  }, [activeTableId, isDataLoaded, loadTableData]);

  // Обработчик клика по строке
  const handleRowClick = useCallback((itemId) => {
    setSelectedItemId((prev) => (prev === itemId ? null : itemId));
  }, []);

  // Функция для переключения раскрытия градации цен
  const togglePriceExpansion = useCallback((itemId) => {
    setExpandedPriceRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Функция для переключения раскрытия меню выбора таблиц
  const toggleInfoExpansion = useCallback((itemId) => {
    setExpandedInfoRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
        // Также закрываем все раскрытые таблицы для этого ID
        setExpandedInfoTables((prevTables) => {
          const newTables = { ...prevTables };
          delete newTables[itemId];
          return newTables;
        });
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Функция для переключения раскрытия конкретной таблицы для ID
  const toggleInfoTable = useCallback((itemId, tableId) => {
    setExpandedInfoTables((prev) => {
      const currentExpanded = prev[itemId] || new Set();
      const newExpanded = new Set(currentExpanded);

      if (newExpanded.has(tableId)) {
        newExpanded.delete(tableId);
      } else {
        newExpanded.add(tableId);
      }

      return {
        ...prev,
        [itemId]: newExpanded,
      };
    });
  }, []);

  // Функция для переключения раскрытия меню категорий
  const toggleCategoriesExpansion = useCallback((itemId) => {
    setExpandedCategoriesRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Обработчик клика вне таблицы
  const handleOutsideClick = useCallback((e) => {
    const isTableClick =
      e.target.closest("table") ||
      e.target.closest("[data-table-container]") ||
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest("select") ||
      e.target.closest("textarea");

    if (!isTableClick) {
      setSelectedItemId(null);
    }
  }, []);

  // Добавляем слушатель кликов и обработчик колесика мыши для полей ввода
  useEffect(() => {
    document.addEventListener("click", handleOutsideClick);

    // Отключаем изменение значений в полях ввода при прокрутке колесиком
    const handleWheel = (e) => {
      if (e.target.type === "number") {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("wheel", handleWheel);
    };
  }, [handleOutsideClick]);

  // Текущие фильтры активной таблицы
  const currentFilters = activeTable?.filters || {
    searchId: "",
    rangeFilters: {
      baseCost: { min: "", max: "" },
      stock: { min: "", max: "" },
      daysStock: { min: "", max: "" },
      salesMonth: { min: "", max: "" },
      applicationsMonth: { min: "", max: "" },
      sales2Weeks: { min: "", max: "" },
      applications2Weeks: { min: "", max: "" },
      crmStock: { min: "", max: "" },
      crmPrice: { min: "", max: "" },
      promPrice: { min: "", max: "" },
    },
    priceChangeFilter: "all",
    currentPage: 1,
    itemsPerPage: 100,
    showOnlyProm: false,
    hiddenCrmCategories: ["93", "55", "52", "46", "16", "000000025"],
    hideCrmStockZero: false,
    hideCrmStockLowSix: false,
    sortConfig: { key: null, direction: "asc" },
  };

  const getGradientColor = (percentage) => {
    const ratio = (percentage - 10) / 90;
    const red = Math.round(220 - (220 - 40) * ratio);
    const green = Math.round(53 + (167 - 53) * ratio);
    return `rgb(${red}, ${green}, 69)`;
  };

  const parseXmlFromString = (xmlString) => {
    const parser = new DOMParser();
    return parser.parseFromString(xmlString, "text/xml");
  };

  // Кеш для нормализованных ID
  const normalizeCache = new Map();

  // Создаем регулярное выражение один раз для лучшей производительности
  const charReplacements = [
    // Кириллические буквы → Латинские буквы
    [/[Аа]/g, "a"],
    [/[Вв]/g, "b"],
    [/[Сс]/g, "c"],
    [/[Ее]/g, "e"],
    [/[Нн]/g, "h"],
    [/[Кк]/g, "k"],
    [/[Мм]/g, "m"],
    [/[Оо]/g, "o"],
    [/[Рр]/g, "p"],
    [/[Тт]/g, "t"],
    [/[Хх]/g, "x"],
    [/[Уу]/g, "y"],
    [/[Іі]/g, "i"],
    [/[Јј]/g, "j"],
    [/[Ѕѕ]/g, "s"],

    // Тире и дефисы
    [/[—–−‐]/g, "-"],

    // Пробельные символы (убираем все)
    [/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ""],
  ];

  const normalizeId = (id) => {
    if (!id) return "";

    const idStr = String(id);

    // Проверяем кеш
    if (normalizeCache.has(idStr)) {
      return normalizeCache.get(idStr);
    }

    // Быстрая проверка - если ID содержит только латинские символы, цифры и разрешенные символы
    if (/^[a-zA-Z0-9\-_.]*$/.test(idStr)) {
      const result = idStr.replace(/\s+/g, "").toLowerCase();
      normalizeCache.set(idStr, result);
      return result;
    }

    // Применяем замены
    let normalized = idStr;
    for (const [regex, replacement] of charReplacements) {
      normalized = normalized.replace(regex, replacement);
    }

    // Убираем пробелы и приводим к нижнему регистру
    const result = normalized.replace(/\s+/g, "").toLowerCase();

    // Сохраняем в кеш (ограничиваем размер кеша)
    if (normalizeCache.size > 10000) {
      normalizeCache.clear();
    }
    normalizeCache.set(idStr, result);

    return result;
  };

  const CORS_PROXIES = [
    "https://api.allorigins.win/get?url=",
    "https://corsproxy.io/?",
    "https://cors-anywhere.herokuapp.com/",
    "https://api.codetabs.com/v1/proxy?quest=",
  ];

  const fetchWithCorsHandling = async (url, description) => {
    try {
      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        headers: {
          Accept: "application/xml, text/xml, */*",
          "Content-Type": "application/xml",
        },
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.text();
    } catch (directError) {
      for (let i = 0; i < CORS_PROXIES.length; i++) {
        const proxy = CORS_PROXIES[i];
        try {
          let proxyUrl,
            parseResponse = (response) => response.text();

          if (proxy.includes("allorigins.win")) {
            proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            parseResponse = async (response) => {
              const json = await response.json();
              if (json.status && json.status.http_code === 200)
                return json.contents;
              throw new Error(
                `AllOrigins proxy error: ${
                  json.status ? json.status.http_code : "unknown"
                }`
              );
            };
          } else if (proxy.includes("codetabs.com")) {
            proxyUrl = `${proxy}${encodeURIComponent(url)}`;
          } else {
            proxyUrl = `${proxy}${url}`;
          }

          const response = await fetch(proxyUrl, {
            method: "GET",
            headers: {
              Accept:
                "application/json, application/xml, text/xml, text/plain, */*",
            },
          });
          if (!response.ok)
            throw new Error(`Proxy HTTP error! status: ${response.status}`);
          return await parseResponse(response);
        } catch (proxyError) {
          if (i === CORS_PROXIES.length - 1)
            console.error(`Все прокси не удались для ${description}`);
        }
      }
      throw new Error(
        `Не удалось загрузить ${description}. Установите CORS расширение или попробуйте позже.`
      );
    }
  };

  // Функция для форматирования времени последнего обновления
  const formatDateTime = (date) => {
    if (!date) return "Не обновлялось";
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        console.warn("Невалидная дата:", date);
        return "Неверная дата";
      }
      return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateObj);
    } catch (error) {
      console.error("Ошибка форматирования даты:", error, date);
      return "Ошибка даты";
    }
  };

  // Объединенная функция обновления XML для активной таблицы
  const updateTableXmlData = async () => {
    if (!activeTableId) return;

    setTableXmlLoadingStatus((prev) => ({
      ...prev,
      [activeTableId]: { crm: "loading", prom: "loading" },
    }));

    try {
      // Загружаем CRM данные
      const crmXmlText = await fetchWithCorsHandling(CRM_XML_URL, "CRM данных");
      const crmXmlDoc = parseXmlFromString(crmXmlText);
      if (crmXmlDoc.querySelector("parsererror"))
        throw new Error("CRM XML parsing error");

      const categories = crmXmlDoc.querySelectorAll("category");
      const newCrmCategories = {},
        newAvailableCategories = [];
      categories.forEach((category) => {
        const id = category.getAttribute("id"),
          name = category.textContent;
        if (id && name) {
          newCrmCategories[id] = name;
          newAvailableCategories.push({ id, name });
        }
      });

      const crmOffers = crmXmlDoc.querySelectorAll("offer");
      const newCrmData = {};
      crmOffers.forEach((offer) => {
        const id = offer.getAttribute("id"),
          priceElement = offer.querySelector("price");
        const categoryIdElement = offer.querySelector("categoryId");
        const stockElement = offer.querySelector("quantity_in_stock");
        if (id && priceElement) {
          const price = parseFloat(priceElement.textContent);
          const stock = stockElement
            ? parseFloat(stockElement.textContent)
            : null;
          if (!isNaN(price)) {
            const categoryId = categoryIdElement
              ? categoryIdElement.textContent
              : null;
            const normalizedId = normalizeId(id);

            // Проверяем что stock это число (включая 0)
            const finalStock = stockElement && !isNaN(stock) ? stock : null;

            newCrmData[normalizedId] = {
              price,
              stock: finalStock,
              categoryId,
              categoryName: categoryId ? newCrmCategories[categoryId] : null,
            };
          }
        }
      });

      // Загружаем PROM данные
      const promXmlText = await fetchWithCorsHandling(
        PROM_XML_URL,
        "PROM данных"
      );
      const promXmlDoc = parseXmlFromString(promXmlText);
      if (promXmlDoc.querySelector("parsererror"))
        throw new Error("PROM XML parsing error");

      const promOffers = promXmlDoc.querySelectorAll("offer");
      const newPromData = {};
      promOffers.forEach((offer) => {
        let vendorCodeElement =
          offer.querySelector("vendorCode") ||
          offer.querySelector(
            'param[name="vendorCode"], param[name="Vendor Code"], param[name="VendorCode"]'
          );
        const priceElement = offer.querySelector("price");

        if (vendorCodeElement && priceElement) {
          const vendorCode =
            vendorCodeElement.textContent ||
            vendorCodeElement.getAttribute("value");
          const price = parseFloat(priceElement.textContent);
          if (vendorCode && !isNaN(price)) {
            const normalizedId = normalizeId(vendorCode);

            // Отладка для проблемных ID
            if (
              vendorCode !== normalizedId &&
              vendorCode.toLowerCase().replace(/\s+/g, "") !== normalizedId
            ) {
              console.log(
                `🔄 PROM ID нормализован: "${vendorCode}" → "${normalizedId}"`
              );
            }

            newPromData[normalizedId] = price;
          }
        } else if (priceElement) {
          const offerId = offer.getAttribute("id"),
            price = parseFloat(priceElement.textContent);
          if (offerId && !isNaN(price)) {
            const normalizedId = normalizeId(offerId);

            // Отладка для проблемных ID
            if (
              offerId !== normalizedId &&
              offerId.toLowerCase().replace(/\s+/g, "") !== normalizedId
            ) {
              console.log(
                `🔄 PROM offer ID нормализован: "${offerId}" → "${normalizedId}"`
              );
            }

            newPromData[normalizedId] = price;
          }
        }
      });

      // Сохраняем XML данные ТОЛЬКО для этой таблицы
      setTableXmlData((prev) => ({
        ...prev,
        [activeTableId]: {
          crm: newCrmData,
          prom: newPromData,
          categories: newAvailableCategories,
        },
      }));

      setTableXmlLoadingStatus((prev) => ({
        ...prev,
        [activeTableId]: { crm: "loaded", prom: "loaded" },
      }));

      // Обновляем время последнего обновления для этой таблицы
      const tableKey = `table_${activeTableId}`;
      setXmlLastUpdate((prev) => ({ ...prev, [tableKey]: new Date() }));
      setXmlDataCounts((prev) => ({
        ...prev,
        [`${tableKey}_crm`]: Object.keys(newCrmData).length,
        [`${tableKey}_prom`]: Object.keys(newPromData).length,
      }));

      // Обновляем доступные категории только если это первая загрузка
      if (availableCrmCategories.length === 0) {
        setAvailableCrmCategories(newAvailableCategories);
      }

      addNotification(
        `📋 XML данные таблицы "${activeTable?.name}" обновлены: CRM ${
          Object.keys(newCrmData).length
        } поз., PROM ${Object.keys(newPromData).length} поз.`,
        "primary"
      );
    } catch (error) {
      setTableXmlLoadingStatus((prev) => ({
        ...prev,
        [activeTableId]: { crm: "error", prom: "error" },
      }));
      addNotification(`❌ Ошибка обновления XML таблицы: ${error.message}`);
      setTimeout(() => addNotification(null), 5000);
    }
  };

  const getItemWithTableXml = useCallback(
    (item, tableId) => {
      const tableXml = tableXmlData[tableId];
      if (!tableXml) return item;

      const normalizedId = item.normalizedId || normalizeId(item.id);
      const crmInfo = tableXml.crm[normalizedId];
      const promPrice = tableXml.prom[normalizedId];

      return {
        ...item,
        crmPrice: crmInfo?.price !== undefined ? crmInfo.price : null,
        crmStock: crmInfo?.stock !== undefined ? crmInfo.stock : null,
        crmCategoryId: crmInfo?.categoryId || null,
        crmCategoryName: crmInfo?.categoryName || null,
        promPrice: promPrice || null,
      };
    },
    [tableXmlData]
  );

  // Объединенная функция обновления XML для глобальных представлений
  const updatePriceChangedXmlData = async () => {
    setGlobalXmlLoadingStatus({ crm: "loading", prom: "loading" });

    try {
      // Загружаем CRM данные
      const crmXmlText = await fetchWithCorsHandling(
        CRM_XML_URL,
        "CRM данных для измененных цен"
      );
      const crmXmlDoc = parseXmlFromString(crmXmlText);
      if (crmXmlDoc.querySelector("parsererror"))
        throw new Error("CRM XML parsing error");

      const categories = crmXmlDoc.querySelectorAll("category");
      const newCrmCategories = {};
      categories.forEach((category) => {
        const id = category.getAttribute("id"),
          name = category.textContent;
        if (id && name) {
          newCrmCategories[id] = name;
        }
      });

      const crmOffers = crmXmlDoc.querySelectorAll("offer");
      const newGlobalCrmData = {};
      crmOffers.forEach((offer) => {
        const id = offer.getAttribute("id"),
          priceElement = offer.querySelector("price");
        const categoryIdElement = offer.querySelector("categoryId");
        const stockElement = offer.querySelector("quantity_in_stock");
        if (id && priceElement) {
          const price = parseFloat(priceElement.textContent);
          const stock = stockElement
            ? parseFloat(stockElement.textContent)
            : null;
          if (!isNaN(price)) {
            const categoryId = categoryIdElement
              ? categoryIdElement.textContent
              : null;
            const normalizedId = normalizeId(id);

            // Отладка для проблемных ID в глобальных CRM данных (измененные цены)
            if (
              id !== normalizedId &&
              id.toLowerCase().replace(/\s+/g, "") !== normalizedId
            ) {
              console.log(
                `🔄 Глобальный CRM ID (измененные цены) нормализован: "${id}" → "${normalizedId}"`
              );
            }

            // Проверяем что stock это число (включая 0)
            const finalStock = stockElement && !isNaN(stock) ? stock : null;

            newGlobalCrmData[normalizedId] = {
              price,
              stock: finalStock,
              categoryId,
              categoryName: categoryId ? newCrmCategories[categoryId] : null,
            };
          }
        }
      });

      // Загружаем PROM данные
      const promXmlText = await fetchWithCorsHandling(
        PROM_XML_URL,
        "PROM данных для измененных цен"
      );
      const promXmlDoc = parseXmlFromString(promXmlText);
      if (promXmlDoc.querySelector("parsererror"))
        throw new Error("PROM XML parsing error");

      const promOffers = promXmlDoc.querySelectorAll("offer");
      const newGlobalPromData = {};
      promOffers.forEach((offer) => {
        let vendorCodeElement =
          offer.querySelector("vendorCode") ||
          offer.querySelector(
            'param[name="vendorCode"], param[name="Vendor Code"], param[name="VendorCode"]'
          );
        const priceElement = offer.querySelector("price");

        if (vendorCodeElement && priceElement) {
          const vendorCode =
            vendorCodeElement.textContent ||
            vendorCodeElement.getAttribute("value");
          const price = parseFloat(priceElement.textContent);
          if (vendorCode && !isNaN(price)) {
            const normalizedId = normalizeId(vendorCode);

            // Отладка для проблемных ID в глобальных PROM данных (измененные цены)
            if (
              vendorCode !== normalizedId &&
              vendorCode.toLowerCase().replace(/\s+/g, "") !== normalizedId
            ) {
              console.log(
                `🔄 Глобальный PROM ID (измененные цены) нормализован: "${vendorCode}" → "${normalizedId}"`
              );
            }

            newGlobalPromData[normalizedId] = price;
          }
        } else if (priceElement) {
          const offerId = offer.getAttribute("id"),
            price = parseFloat(priceElement.textContent);
          if (offerId && !isNaN(price)) {
            const normalizedId = normalizeId(offerId);

            // Отладка для проблемных ID в глобальных PROM offer данных (измененные цены)
            if (
              offerId !== normalizedId &&
              offerId.toLowerCase().replace(/\s+/g, "") !== normalizedId
            ) {
              console.log(
                `🔄 Глобальный PROM offer ID (измененные цены) нормализован: "${offerId}" → "${normalizedId}"`
              );
            }

            newGlobalPromData[normalizedId] = price;
          }
        }
      });

      // Обновляем состояния
      setGlobalCrmData(newGlobalCrmData);
      setGlobalPromData(newGlobalPromData);
      setGlobalXmlLoadingStatus({ crm: "loaded", prom: "loaded" });

      // Обновляем время последнего обновления ДЛЯ ИЗМЕНЕННЫХ ЦЕН
      setXmlLastUpdate((prev) => ({
        ...prev,
        global_price_changed: new Date(),
      }));

      addNotification(
        `📈 XML данные для измененных цен обновлены: CRM ${
          Object.keys(newGlobalCrmData).length
        } поз., PROM ${Object.keys(newGlobalPromData).length} поз.`
      );
      setTimeout(() => addNotification(null), 4000);
    } catch (error) {
      setGlobalXmlLoadingStatus({ crm: "error", prom: "error" });
      alert(
        `Ошибка обновления XML данных для измененных цен: ${error.message}`
      );
    }
  };

  // Функция обновления XML для секции "Комментарии"
  const updateCommentedXmlData = async () => {
    setGlobalXmlLoadingStatus({ crm: "loading", prom: "loading" });

    try {
      // Загружаем CRM данные
      const crmXmlText = await fetchWithCorsHandling(
        CRM_XML_URL,
        "CRM данных для комментариев"
      );
      const crmXmlDoc = parseXmlFromString(crmXmlText);
      if (crmXmlDoc.querySelector("parsererror"))
        throw new Error("CRM XML parsing error");

      const categories = crmXmlDoc.querySelectorAll("category");
      const newCrmCategories = {};
      categories.forEach((category) => {
        const id = category.getAttribute("id"),
          name = category.textContent;
        if (id && name) {
          newCrmCategories[id] = name;
        }
      });

      const crmOffers = crmXmlDoc.querySelectorAll("offer");
      const newGlobalCrmData = {};
      crmOffers.forEach((offer) => {
        const id = offer.getAttribute("id"),
          priceElement = offer.querySelector("price");
        const categoryIdElement = offer.querySelector("categoryId");
        const stockElement = offer.querySelector("quantity_in_stock");
        if (id && priceElement) {
          const price = parseFloat(priceElement.textContent);
          const stock = stockElement
            ? parseFloat(stockElement.textContent)
            : null;
          if (!isNaN(price)) {
            const categoryId = categoryIdElement
              ? categoryIdElement.textContent
              : null;
            const normalizedId = normalizeId(id);

            // Отладка для проблемных ID в глобальных CRM данных (комментарии)
            if (
              id !== normalizedId &&
              id.toLowerCase().replace(/\s+/g, "") !== normalizedId
            ) {
              console.log(
                `🔄 Глобальный CRM ID (комментарии) нормализован: "${id}" → "${normalizedId}"`
              );
            }

            // Проверяем что stock это число (включая 0)
            const finalStock = stockElement && !isNaN(stock) ? stock : null;

            newGlobalCrmData[normalizedId] = {
              price,
              stock: finalStock,
              categoryId,
              categoryName: categoryId ? newCrmCategories[categoryId] : null,
            };
          }
        }
      });

      // Загружаем PROM данные
      const promXmlText = await fetchWithCorsHandling(
        PROM_XML_URL,
        "PROM данных для комментариев"
      );
      const promXmlDoc = parseXmlFromString(promXmlText);
      if (promXmlDoc.querySelector("parsererror"))
        throw new Error("PROM XML parsing error");

      const promOffers = promXmlDoc.querySelectorAll("offer");
      const newGlobalPromData = {};
      promOffers.forEach((offer) => {
        let vendorCodeElement =
          offer.querySelector("vendorCode") ||
          offer.querySelector(
            'param[name="vendorCode"], param[name="Vendor Code"], param[name="VendorCode"]'
          );
        const priceElement = offer.querySelector("price");

        if (vendorCodeElement && priceElement) {
          const vendorCode =
            vendorCodeElement.textContent ||
            vendorCodeElement.getAttribute("value");
          const price = parseFloat(priceElement.textContent);
          if (vendorCode && !isNaN(price)) {
            const normalizedId = normalizeId(vendorCode);

            // Отладка для проблемных ID в глобальных PROM данных (комментарии)
            if (
              vendorCode !== normalizedId &&
              vendorCode.toLowerCase().replace(/\s+/g, "") !== normalizedId
            ) {
              console.log(
                `🔄 Глобальный PROM ID (комментарии) нормализован: "${vendorCode}" → "${normalizedId}"`
              );
            }

            newGlobalPromData[normalizedId] = price;
          }
        } else if (priceElement) {
          const offerId = offer.getAttribute("id"),
            price = parseFloat(priceElement.textContent);
          if (offerId && !isNaN(price)) {
            const normalizedId = normalizeId(offerId);

            // Отладка для проблемных ID в глобальных PROM offer данных (комментарии)
            if (
              offerId !== normalizedId &&
              offerId.toLowerCase().replace(/\s+/g, "") !== normalizedId
            ) {
              console.log(
                `🔄 Глобальный PROM offer ID (комментарии) нормализован: "${offerId}" → "${normalizedId}"`
              );
            }

            newGlobalPromData[normalizedId] = price;
          }
        }
      });

      // Обновляем состояния
      setGlobalCrmData(newGlobalCrmData);
      setGlobalPromData(newGlobalPromData);
      setGlobalXmlLoadingStatus({ crm: "loaded", prom: "loaded" });

      // Обновляем время последнего обновления ДЛЯ КОММЕНТАРИЕВ
      setXmlLastUpdate((prev) => ({ ...prev, global_commented: new Date() }));

      addNotification(
        `💬 XML данные для комментариев обновлены: CRM ${
          Object.keys(newGlobalCrmData).length
        } поз., PROM ${Object.keys(newGlobalPromData).length} поз.`
      );
      setTimeout(() => addNotification(null), 4000);
    } catch (error) {
      setGlobalXmlLoadingStatus({ crm: "error", prom: "error" });
      alert(`Ошибка обновления XML данных для комментариев: ${error.message}`);
    }
  };

  // Функция для обновления фильтров активной таблицы
  const updateTableFilters = (updates, isManualPageChange = false) => {
    if (!activeTableId) return;

    setTables((prev) =>
      prev.map((table) =>
        table.id === activeTableId
          ? { ...table, filters: { ...table.filters, ...updates } }
          : table
      )
    );

    // Если это ручной переход между страницами - полный скролл
    if (isManualPageChange && updates.currentPage) {
      resetTableScrollAndScrollToTable();
    }
    // Если это фильтры/поиск - только сброс внутренней прокрутки
    else if (
      updates.currentPage === 1 ||
      Object.keys(updates).some((key) => key !== "currentPage")
    ) {
      resetTableScrollOnly();
    }
  };

  // Функция для получения данных по ID из других таблиц
  const getItemDataFromOtherTables = useCallback(
    (itemId, currentTableId = null) => {
      const otherTables = currentTableId
        ? tables.filter((table) => table.id !== currentTableId)
        : tables;

      return otherTables.map((table) => {
        const item = table.data.find((dataItem) => dataItem.id === itemId);
        if (!item) {
          return {
            tableName: table.name,
            tableId: table.id,
            uploadTime: table.uploadTime,
            data: null, // null если ID не найден в этой таблице
          };
        }

        // Применяем XML данные для этой таблицы
        const itemWithXml = getItemWithTableXml(item, table.id);

        return {
          tableName: table.name,
          tableId: table.id,
          uploadTime: table.uploadTime,
          data: itemWithXml,
        };
      });
    },
    [tables, getItemWithTableXml]
  );

  // Глобальные данные для специальных представлений с дедупликацией по ID
  const getGlobalViewData = useCallback(
    (viewType) => {
      const itemsMap = new Map();

      const allItems = new Map();

      tables.forEach((table) => {
        table.data.forEach((item) => {
          const normalizedId = normalizeId(item.id);

          if (!allItems.has(normalizedId)) {
            allItems.set(normalizedId, {
              items: [],
              latestPriceChange: null,
              latestComment: null,
            });
          }

          const itemData = allItems.get(normalizedId);
          itemData.items.push({ item, table });

          if (item.priceHistory && item.priceHistory.length > 0) {
            const lastPriceChange =
              item.priceHistory[item.priceHistory.length - 1];
            if (
              !itemData.latestPriceChange ||
              new Date(lastPriceChange.date) >
                new Date(itemData.latestPriceChange.date)
            ) {
              itemData.latestPriceChange = {
                ...lastPriceChange,
                tableName: lastPriceChange.tableName || table.name,
                tableId: lastPriceChange.tableId || table.id,
              };
            }
          }

          if (item.comments && item.comments.length > 0) {
            const lastComment = item.comments[item.comments.length - 1];
            if (
              !itemData.latestComment ||
              new Date(lastComment.date) > new Date(itemData.latestComment.date)
            ) {
              itemData.latestComment = {
                ...lastComment,
                tableName: lastComment.tableName || table.name,
                tableId: lastComment.tableId || table.id,
              };
            }
          }
        });
      });

      allItems.forEach((itemData, normalizedId) => {
        let selectedItem = null;
        let selectedTable = null;

        if (viewType === "price_changed" && itemData.latestPriceChange) {
          const targetChange = itemData.latestPriceChange;
          for (const { item, table } of itemData.items) {
            if (item.priceHistory && item.priceHistory.length > 0) {
              const lastChange =
                item.priceHistory[item.priceHistory.length - 1];
              if (
                lastChange.date === targetChange.date &&
                (lastChange.tableName || table.name) === targetChange.tableName
              ) {
                selectedItem = item;
                selectedTable = table;
                break;
              }
            }
          }

          if (!selectedItem) {
            for (const { item, table } of itemData.items) {
              if (item.priceHistory && item.priceHistory.length > 0) {
                selectedItem = item;
                selectedTable = table;
                break;
              }
            }
          }
        } else if (viewType === "commented" && itemData.latestComment) {
          const targetComment = itemData.latestComment;
          for (const { item, table } of itemData.items) {
            if (item.comments && item.comments.length > 0) {
              const lastComment = item.comments[item.comments.length - 1];
              if (
                lastComment.date === targetComment.date &&
                (lastComment.tableName || table.name) ===
                  targetComment.tableName
              ) {
                selectedItem = item;
                selectedTable = table;
                break;
              }
            }
          }

          if (!selectedItem) {
            for (const { item, table } of itemData.items) {
              if (item.comments && item.comments.length > 0) {
                selectedItem = item;
                selectedTable = table;
                break;
              }
            }
          }
        }

        if (!selectedItem || !selectedTable) return;

        let itemWithGlobalData = {
          ...selectedItem,
          // Очищаем XML данные из таблицы
          crmPrice: null,
          crmStock: null,
          crmCategoryId: null,
          crmCategoryName: null,
          promPrice: null,
        };

        // Применяем ТОЛЬКО глобальные XML данные
        if (Object.keys(globalCrmData).length > 0) {
          const globalCrmInfo = globalCrmData[normalizedId];
          if (globalCrmInfo) {
            itemWithGlobalData.crmPrice =
              globalCrmInfo.price !== undefined ? globalCrmInfo.price : null;
            itemWithGlobalData.crmStock =
              globalCrmInfo.stock !== undefined ? globalCrmInfo.stock : null;
            itemWithGlobalData.crmCategoryId = globalCrmInfo.categoryId || null;
            itemWithGlobalData.crmCategoryName =
              globalCrmInfo.categoryName || null;
          }
        }
        if (Object.keys(globalPromData).length > 0) {
          const globalPromPrice = globalPromData[normalizedId];
          if (globalPromPrice) {
            itemWithGlobalData.promPrice = globalPromPrice;
          }
        }

        const finalItem = {
          ...itemWithGlobalData,
          lastCommentDate: itemData.latestComment?.date || null,
          lastCommentText: itemData.latestComment?.text || "",
          lastPriceChangeDate: itemData.latestPriceChange?.date || null,
          lastPrice: itemData.latestPriceChange?.price || null,
          primaryTableName: selectedTable.name,
          primaryTableId: selectedTable.id,
        };

        itemsMap.set(normalizedId, finalItem);
      });

      return Array.from(itemsMap.values());
    },
    [tables, globalCrmData, globalPromData]
  );

  // Глобальная аналитика с дедупликацией по ID
  const globalAnalytics = useMemo(() => {
    const analytics = {
      totalTables: tables.length,
      uniqueItems: new Set(),
      totalPriceChanges: 0,
      totalComments: 0,
      priceChangesByDate: {},
      commentsByDate: {},
      priceChangedItems: [],
      commentedItems: [],
      tableStats: [],
    };

    tables.forEach((table) => {
      let tablePriceChanges = 0,
        tableComments = 0;
      const tablePriceChangedItems = [],
        tableCommentedItems = [];

      table.data.forEach((item) => {
        analytics.uniqueItems.add(normalizeId(item.id));

        if (item.priceHistory && item.priceHistory.length > 0) {
          tablePriceChanges += item.priceHistory.length;
          analytics.totalPriceChanges += item.priceHistory.length;
          const itemWithChanges = {
            ...item,
            tableName: table.name,
            tableId: table.id,
            uploadTime: table.uploadTime,
          };
          tablePriceChangedItems.push(itemWithChanges);
          item.priceHistory.forEach((change) => {
            const date = new Date(change.date).toLocaleDateString();
            analytics.priceChangesByDate[date] =
              (analytics.priceChangesByDate[date] || 0) + 1;
          });
        }

        if (item.comments && item.comments.length > 0) {
          tableComments += item.comments.length;
          analytics.totalComments += item.comments.length;
          const itemWithComments = {
            ...item,
            tableName: table.name,
            tableId: table.id,
            uploadTime: table.uploadTime,
          };
          tableCommentedItems.push(itemWithComments);
          item.comments.forEach((comment) => {
            const date = new Date(comment.date).toLocaleDateString();
            analytics.commentsByDate[date] =
              (analytics.commentsByDate[date] || 0) + 1;
          });
        }
      });

      analytics.tableStats.push({
        ...table,
        priceChanges: tablePriceChanges,
        comments: tableComments,
        itemsCount: table.data.length,
        priceChangedItems: tablePriceChangedItems,
        commentedItems: tableCommentedItems,
      });
    });

    analytics.priceChangedItems = getGlobalViewData("price_changed");
    analytics.commentedItems = getGlobalViewData("commented");
    analytics.uniquePriceChangedItems = analytics.priceChangedItems.length;
    analytics.uniqueCommentedItems = analytics.commentedItems.length;
    analytics.totalItems = analytics.uniqueItems.size;

    return analytics;
  }, [tables, getGlobalViewData]);

  // Предварительно подготавливаем данные с XML один раз
  const dataWithXml = useMemo(() => {
    return data.map((item) => getItemWithTableXml(item, activeTableId));
  }, [data, activeTableId, getItemWithTableXml]);

  // Предварительно нормализуем поисковый запрос
  const normalizedSearchTerm = useMemo(() => {
    return currentFilters.searchId.trim()
      ? normalizeId(currentFilters.searchId)
      : "";
  }, [currentFilters.searchId]);

  const filteredData = useMemo(() => {
    let filtered = dataWithXml;

    // Быстрая фильтрация по поиску - делаем первой для сокращения объема данных
    if (normalizedSearchTerm) {
      filtered = filtered.filter((item) =>
        item.normalizedId
          ? item.normalizedId.includes(normalizedSearchTerm)
          : normalizeId(item.id).includes(normalizedSearchTerm)
      );
    }

    // Остальные фильтры применяем к уже отфильтрованному набору
    if (currentFilters.showOnlyProm) {
      filtered = filtered.filter((item) => item.promPrice);
    }

    if (currentFilters.hiddenCrmCategories.length > 0) {
      const hiddenCategories = new Set(currentFilters.hiddenCrmCategories);
      filtered = filtered.filter(
        (item) => !hiddenCategories.has(item.crmCategoryId)
      );
    }

    if (currentFilters.hideCrmStockZero) {
      filtered = filtered.filter((item) => item.crmStock !== 0);
    }

    if (currentFilters.hideCrmStockLowSix) {
      filtered = filtered.filter(
        (item) => item.crmStock === null || item.crmStock >= 6
      );
    }

    if (currentFilters.priceChangeFilter === "hide_changed") {
      filtered = filtered.filter(
        (item) => !(item.priceHistory && item.priceHistory.length > 0)
      );
    }

    // Диапазонные фильтры
    Object.entries(currentFilters.rangeFilters).forEach(([field, range]) => {
      if (range.min !== "" || range.max !== "") {
        const min = range.min !== "" ? parseFloat(range.min) : -Infinity;
        const max = range.max !== "" ? parseFloat(range.max) : Infinity;

        filtered = filtered.filter((item) => {
          let value = item[field];
          if (field === "crmStock" && value === null) return true;
          if ((field === "crmPrice" || field === "promPrice") && !item[field])
            value = 0;
          if (
            (field === "applicationsMonth" ||
              field === "applications2Weeks" ||
              field === "redemptionMonth" ||
              field === "redemption2Weeks" ||
              field === "redemptionMonthPercent" ||
              field === "redemption2WeeksPercent") &&
            value === null
          )
            return true;
          if (value === null || value === undefined) value = 0;
          return value >= min && value <= max;
        });
      }
    });

    return filtered;
  }, [dataWithXml, normalizedSearchTerm, currentFilters]);

  // Глобальные фильтрованные данные
  // Базовые данные для глобального представления
  const globalBaseData = useMemo(() => {
    const viewType =
      currentSection === "price_changed_global"
        ? "price_changed"
        : currentSection === "commented_global"
        ? "commented"
        : null;

    if (!viewType) return [];
    return getGlobalViewData(viewType);
  }, [currentSection, getGlobalViewData]);

  // Нормализованный поисковый запрос для глобального поиска
  const globalNormalizedSearchTerm = useMemo(() => {
    return globalViewFilters.searchId.trim()
      ? normalizeId(globalViewFilters.searchId)
      : "";
  }, [globalViewFilters.searchId]);

  const globalFilteredData = useMemo(() => {
    let filtered = globalBaseData;

    // Быстрая фильтрация по поиску первой
    if (globalNormalizedSearchTerm) {
      filtered = filtered.filter((item) =>
        item.normalizedId
          ? item.normalizedId.includes(globalNormalizedSearchTerm)
          : normalizeId(item.id).includes(globalNormalizedSearchTerm)
      );
    }

    // Простые boolean фильтры
    if (globalViewFilters.showOnlyProm) {
      filtered = filtered.filter(
        (item) =>
          item.promPrice !== null &&
          item.promPrice !== undefined &&
          item.promPrice > 0
      );
    }

    if (globalViewFilters.hideCrmStockZero) {
      filtered = filtered.filter((item) => item.crmStock !== 0);
    }

    if (globalViewFilters.hideCrmStockLowSix) {
      filtered = filtered.filter(
        (item) => item.crmStock === null || item.crmStock >= 6
      );
    }

    // Диапазонные фильтры
    Object.entries(globalViewFilters.rangeFilters).forEach(([field, range]) => {
      if (range.min !== "" || range.max !== "") {
        const min = range.min !== "" ? parseFloat(range.min) : -Infinity;
        const max = range.max !== "" ? parseFloat(range.max) : Infinity;

        filtered = filtered.filter((item) => {
          let value = field === "lastPrice" ? item.lastPrice : item[field];

          if (field === "crmStock" && value === null) return true;
          if ((field === "crmPrice" || field === "promPrice") && !value)
            value = 0;
          if (value === null || value === undefined) value = 0;
          return value >= min && value <= max;
        });
      }
    });

    // Фильтры дат
    if (globalViewFilters.dateFilter.from || globalViewFilters.dateFilter.to) {
      const fromDate = globalViewFilters.dateFilter.from
        ? new Date(globalViewFilters.dateFilter.from)
        : new Date("1900-01-01");
      const toDate = globalViewFilters.dateFilter.to
        ? new Date(globalViewFilters.dateFilter.to + "T23:59:59")
        : new Date("2100-12-31");

      filtered = filtered.filter((item) => {
        if (!item.lastPriceChangeDate) return false;
        const lastChangeDate = new Date(item.lastPriceChangeDate);
        return lastChangeDate >= fromDate && lastChangeDate <= toDate;
      });
    }

    if (
      globalViewFilters.dateCommentFilter.from ||
      globalViewFilters.dateCommentFilter.to
    ) {
      const fromDate = globalViewFilters.dateCommentFilter.from
        ? new Date(globalViewFilters.dateCommentFilter.from)
        : new Date("1900-01-01");
      const toDate = globalViewFilters.dateCommentFilter.to
        ? new Date(globalViewFilters.dateCommentFilter.to + "T23:59:59")
        : new Date("2100-12-31");

      filtered = filtered.filter((item) => {
        if (!item.lastCommentDate) return false;
        const lastCommentDate = new Date(item.lastCommentDate);
        return lastCommentDate >= fromDate && lastCommentDate <= toDate;
      });
    }

    return filtered;
  }, [globalBaseData, globalNormalizedSearchTerm, globalViewFilters]);

  const calculateTotalCost = (baseCost, commission) => {
    const targetAmount = baseCost + 20 + 50;
    return targetAmount / (1 - commission / 100);
  };

  const calculateMarkup = (totalCost, percentage) =>
    totalCost + totalCost * (percentage / 100);

  // Обновленная функция сортировки с тремя состояниями
  const handleSort = (key) => {
    let direction = "asc";
    if (currentFilters.sortConfig.key === key) {
      if (currentFilters.sortConfig.direction === "asc") {
        direction = "desc";
      } else if (currentFilters.sortConfig.direction === "desc") {
        // Третье состояние - сброс сортировки
        updateTableFilters({ sortConfig: { key: null, direction: "asc" } });
        return;
      }
    }
    updateTableFilters({ sortConfig: { key, direction } });
  };

  const handleGlobalSort = (key) => {
    let direction = "asc";
    if (globalViewFilters.sortConfig.key === key) {
      if (globalViewFilters.sortConfig.direction === "asc") {
        direction = "desc";
      } else if (globalViewFilters.sortConfig.direction === "desc") {
        // Третье состояние - сброс сортировки
        setGlobalViewFilters((prev) => ({
          ...prev,
          sortConfig: { key: null, direction: "asc" },
        }));
        return;
      }
    }
    setGlobalViewFilters((prev) => ({
      ...prev,
      sortConfig: { key, direction },
    }));
  };

  const sortedData = useMemo(() => {
    let sorted = [...filteredData];
    if (!currentFilters.sortConfig.key) return sorted;

    return sorted.sort((a, b) => {
      const aValue = a[currentFilters.sortConfig.key];
      const bValue = b[currentFilters.sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return currentFilters.sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();
      if (currentFilters.sortConfig.direction === "asc") {
        return aString < bString ? -1 : aString > bString ? 1 : 0;
      } else {
        return aString > bString ? -1 : aString < bString ? 1 : 0;
      }
    });
  }, [filteredData, currentFilters.sortConfig]);

  // Модифицированная сортировка для глобальных данных с сортировкой по умолчанию
  const globalSortedData = useMemo(() => {
    let sorted = [...globalFilteredData];

    if (!globalViewFilters.sortConfig.key) {
      if (currentSection === "price_changed_global") {
        return sorted.sort((a, b) => {
          const dateA = a.lastPriceChangeDate
            ? new Date(a.lastPriceChangeDate)
            : new Date(0);
          const dateB = b.lastPriceChangeDate
            ? new Date(b.lastPriceChangeDate)
            : new Date(0);
          return dateB - dateA;
        });
      } else if (currentSection === "commented_global") {
        return sorted.sort((a, b) => {
          const dateA = a.lastCommentDate
            ? new Date(a.lastCommentDate)
            : new Date(0);
          const dateB = b.lastCommentDate
            ? new Date(b.lastCommentDate)
            : new Date(0);
          return dateB - dateA;
        });
      }
      return sorted;
    }

    return sorted.sort((a, b) => {
      const aValue = a[globalViewFilters.sortConfig.key];
      const bValue = b[globalViewFilters.sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return globalViewFilters.sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();
      if (globalViewFilters.sortConfig.direction === "asc") {
        return aString < bString ? -1 : aString > bString ? 1 : 0;
      } else {
        return aString > bString ? -1 : aString < bString ? 1 : 0;
      }
    });
  }, [globalFilteredData, globalViewFilters.sortConfig, currentSection]);

  const paginatedData = useMemo(() => {
    const startIndex =
      (currentFilters.currentPage - 1) * currentFilters.itemsPerPage;
    return sortedData.slice(
      startIndex,
      startIndex + currentFilters.itemsPerPage
    );
  }, [sortedData, currentFilters.currentPage, currentFilters.itemsPerPage]);

  const globalPaginatedData = useMemo(() => {
    const startIndex =
      (globalViewFilters.currentPage - 1) * globalViewFilters.itemsPerPage;
    return globalSortedData.slice(
      startIndex,
      startIndex + globalViewFilters.itemsPerPage
    );
  }, [
    globalSortedData,
    globalViewFilters.currentPage,
    globalViewFilters.itemsPerPage,
  ]);

  const totalPages = Math.ceil(sortedData.length / currentFilters.itemsPerPage);
  const globalTotalPages = Math.ceil(
    globalSortedData.length / globalViewFilters.itemsPerPage
  );
  const startIndex =
    (currentFilters.currentPage - 1) * currentFilters.itemsPerPage;
  const globalStartIndex =
    (globalViewFilters.currentPage - 1) * globalViewFilters.itemsPerPage;

  const parseRussianNumber = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;

    let str = String(value).trim();
    const isPercentage = str.includes("%");
    if (isPercentage) str = str.replace("%", "");

    const cleanValue = str
      .replace(/\s+/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    let parsed = parseFloat(cleanValue);
    if (isNaN(parsed)) return 0;
    if (isPercentage) parsed = parsed / 100;
    return parsed;
  };

  // Улучшенная функция применения глобальных изменений
  const applyGlobalChanges = (item) => {
    const normalizedId = normalizeId(item.id);

    const savedCommission = globalCommissions[normalizedId];
    if (savedCommission !== undefined) {
      item.commission = savedCommission;
    }

    const globalChanges = globalItemChanges[normalizedId];
    if (globalChanges) {
      return {
        ...item,
        commission:
          globalChanges.commission !== undefined
            ? globalChanges.commission
            : item.commission,
        priceHistory: globalChanges.priceHistory || item.priceHistory || [],
        comments: globalChanges.comments || item.comments || [],
      };
    }
    return item;
  };

  const processData = useCallback(
    (rawJsonData, currentCrmData = {}, currentPromData = {}) => {
      const dataRows = rawJsonData.slice(1);
      const filteredData = dataRows.filter(
        (row) =>
          row &&
          row.some((val) => val !== null && val !== undefined && val !== "")
      );

      return filteredData.map((row, index) => {
        const baseCost = parseRussianNumber(row[1]);
        let commissionValue = parseRussianNumber(row[8]);
        if (commissionValue > 0 && commissionValue < 1)
          commissionValue = commissionValue * 100;
        if (!commissionValue || commissionValue === 0) commissionValue = 17;

        const normalizedId = normalizeId(row[0]);
        const crmInfo = currentCrmData[normalizedId];

        const savedCommission = globalCommissions[normalizedId];
        if (savedCommission !== undefined) {
          commissionValue = savedCommission;
        }

        const totalCost = calculateTotalCost(baseCost, commissionValue);

        const applicationsMonth =
          row[6] !== null && row[6] !== undefined && row[6] !== ""
            ? parseRussianNumber(row[6])
            : null;
        const applications2Weeks =
          row[7] !== null && row[7] !== undefined && row[7] !== ""
            ? parseRussianNumber(row[7])
            : null;
        const salesMonth = parseRussianNumber(row[4]);
        const sales2Weeks = parseRussianNumber(row[5]);

        let item = {
          id: row[0] || `item-${index}`,
          normalizedId: normalizedId, // Добавляем предварительно нормализованный ID
          baseCost,
          totalCost,
          commission: commissionValue,
          stock: parseRussianNumber(row[2]),
          daysStock: parseRussianNumber(row[3]),
          salesMonth,
          applicationsMonth,
          sales2Weeks,
          applications2Weeks,
          markup50_12: calculateMarkup(totalCost, 50),
          newPrice: "",
          priceHistory: [],
          comments: [],
          crmPrice: crmInfo?.price !== undefined ? crmInfo.price : null,
          crmStock: crmInfo?.stock !== undefined ? crmInfo.stock : null,
          crmCategoryId: crmInfo?.categoryId || null,
          crmCategoryName: crmInfo?.categoryName || null,
          promPrice: currentPromData[normalizedId] || null,
          markup10: calculateMarkup(totalCost, 10),
          markup20: calculateMarkup(totalCost, 20),
          markup30: calculateMarkup(totalCost, 30),
          markup40: calculateMarkup(totalCost, 40),
          markup50: calculateMarkup(totalCost, 50),
          markup60: calculateMarkup(totalCost, 60),
          markup70: calculateMarkup(totalCost, 70),
          markup80: calculateMarkup(totalCost, 80),
          markup90: calculateMarkup(totalCost, 90),
          markup100: calculateMarkup(totalCost, 100),
        };

        item = applyGlobalChanges(item);

        if (item.commission !== commissionValue) {
          const newTotalCost = calculateTotalCost(baseCost, item.commission);
          item.totalCost = newTotalCost;
          item.markup50_12 = calculateMarkup(newTotalCost, 50);
          item.markup10 = calculateMarkup(newTotalCost, 10);
          item.markup20 = calculateMarkup(newTotalCost, 20);
          item.markup30 = calculateMarkup(newTotalCost, 30);
          item.markup40 = calculateMarkup(newTotalCost, 40);
          item.markup50 = calculateMarkup(newTotalCost, 50);
          item.markup60 = calculateMarkup(newTotalCost, 60);
          item.markup70 = calculateMarkup(newTotalCost, 70);
          item.markup80 = calculateMarkup(newTotalCost, 80);
          item.markup90 = calculateMarkup(newTotalCost, 90);
          item.markup100 = calculateMarkup(newTotalCost, 100);
        }

        return item;
      });
    },
    [globalItemChanges, globalCommissions]
  );

  const handleFileUpload = (file) => {
    if (isLoading) return;
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length > 1) {
          const processed = processData(jsonData, {}, {});
          const newTable = {
            id: Date.now() + Math.random(),
            name: file.name.replace(/\.[^/.]+$/, ""),
            fileName: file.name,
            uploadTime: new Date(),
            data: processed,
            originalHeaders: jsonData[0] || [],
            filters: {
              searchId: "",
              currentPage: 1,
              itemsPerPage: 100,
              priceChangeFilter: "all",
              showOnlyProm: false,
              hiddenCrmCategories: ["93", "55", "52", "46", "16", "000000025"],
              hideCrmStockZero: false,
              hideCrmStockLowSix: false,
              sortConfig: { key: null, direction: "asc" },
              rangeFilters: {
                baseCost: { min: "", max: "" },
                stock: { min: "", max: "" },
                daysStock: { min: "", max: "" },
                salesMonth: { min: "", max: "" },
                applicationsMonth: { min: "", max: "" },
                redemptionMonth: { min: "", max: "" },
                redemptionMonthPercent: { min: "", max: "" },
                sales2Weeks: { min: "", max: "" },
                applications2Weeks: { min: "", max: "" },
                redemption2Weeks: { min: "", max: "" },
                redemption2WeeksPercent: { min: "", max: "" },
                crmStock: { min: "", max: "" },
                crmPrice: { min: "", max: "" },
                promPrice: { min: "", max: "" },
              },
            },
          };

          setTables((prev) => [...prev, newTable]);
          setActiveTableId(newTable.id);
          setNewPriceInputs({});
          setNewCommentInput("");
          setCurrentSection("table");

          addNotification(
            `Таблица "${newTable.name}" загружена! ${processed.length} позиций.`
          );
          setTimeout(() => addNotification(null), 3000);
        } else {
          throw new Error("Файл пустой или содержит только заголовки");
        }
      } catch (error) {
        alert(`Ошибка при загрузке файла "${file.name}": ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      alert(`Ошибка при чтении файла "${file.name}"`);
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files[0]) handleFileUpload(files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const updateGlobalItemChange = (itemId, changes) => {
    const normalizedId = normalizeId(itemId);
    setGlobalItemChanges((prev) => ({
      ...prev,
      [normalizedId]: { ...prev[normalizedId], ...changes },
    }));

    setTables((prev) =>
      prev.map((table) => ({
        ...table,
        data: table.data.map((item) => {
          if (normalizeId(item.id) === normalizedId) {
            return { ...item, ...changes };
          }
          return item;
        }),
      }))
    );
  };

  // Функция для проверки принадлежности к категории
  const isInCategory = useCallback(
    (itemId, categoryType) => {
      const normalizedId = normalizeId(itemId);
      return globalCategories[categoryType].has(normalizedId);
    },
    [globalCategories]
  );

  // Функция для получения данных конкретной категории
  const getCategoryData = useCallback(
    (categoryType) => {
      const itemsMap = new Map();
      const categoryItems = globalCategories[categoryType];

      if (categoryItems.size === 0) return [];

      // Сначала собираем все данные по ID
      const allItems = new Map();

      tables.forEach((table) => {
        table.data.forEach((item) => {
          const normalizedId = normalizeId(item.id);

          if (categoryItems.has(normalizedId)) {
            const categoryData = categoryItems.get(normalizedId);
            if (!allItems.has(normalizedId)) {
              allItems.set(normalizedId, {
                items: [],
                latestPriceChange: null,
                latestComment: null,
              });
            }

            const itemData = allItems.get(normalizedId);
            itemData.items.push({ item, table });

            // Ищем последнее изменение цены
            if (item.priceHistory && item.priceHistory.length > 0) {
              const lastPriceChange =
                item.priceHistory[item.priceHistory.length - 1];
              if (
                !itemData.latestPriceChange ||
                new Date(lastPriceChange.date) >
                  new Date(itemData.latestPriceChange.date)
              ) {
                itemData.latestPriceChange = {
                  ...lastPriceChange,
                  tableName: lastPriceChange.tableName || table.name,
                  tableId: lastPriceChange.tableId || table.id,
                };
              }
            }

            // Ищем последний комментарий
            if (item.comments && item.comments.length > 0) {
              const lastComment = item.comments[item.comments.length - 1];
              if (
                !itemData.latestComment ||
                new Date(lastComment.date) >
                  new Date(itemData.latestComment.date)
              ) {
                itemData.latestComment = {
                  ...lastComment,
                  tableName: lastComment.tableName || table.name,
                  tableId: lastComment.tableId || table.id,
                };
              }
            }
          }
        });
      });

      // Теперь формируем финальные данные
      allItems.forEach((itemData, normalizedId) => {
        // Выбираем базовый item (первый найденный)
        let selectedItem = null;
        let selectedTable = null;

        for (const { item, table } of itemData.items) {
          selectedItem = item;
          selectedTable = table;
          break;
        }

        if (!selectedItem || !selectedTable) return;

        // Применяем глобальные XML данные
        let itemWithGlobalData = {
          ...selectedItem,
          crmPrice: null,
          crmStock: null,
          crmCategoryId: null,
          crmCategoryName: null,
          promPrice: null,
        };

        if (Object.keys(globalCrmData).length > 0) {
          const globalCrmInfo = globalCrmData[normalizedId];
          if (globalCrmInfo) {
            itemWithGlobalData.crmPrice =
              globalCrmInfo.price !== undefined ? globalCrmInfo.price : null;
            itemWithGlobalData.crmStock =
              globalCrmInfo.stock !== undefined ? globalCrmInfo.stock : null;
            itemWithGlobalData.crmCategoryId = globalCrmInfo.categoryId || null;
            itemWithGlobalData.crmCategoryName =
              globalCrmInfo.categoryName || null;
          }
        }
        if (Object.keys(globalPromData).length > 0) {
          const globalPromPrice = globalPromData[normalizedId];
          if (globalPromPrice) {
            itemWithGlobalData.promPrice = globalPromPrice;
          }
        }

        // Получаем дату добавления в категорию
        const categoryInfo = categoryItems.get(normalizedId);
        const categoryAddedDate =
          categoryInfo?.addedDate || new Date().toISOString();

        const finalItem = {
          ...itemWithGlobalData,
          lastCommentDate: itemData.latestComment?.date || null,
          lastCommentText: itemData.latestComment?.text || "",
          lastPriceChangeDate: itemData.latestPriceChange?.date || null,
          lastPrice: itemData.latestPriceChange?.price || null,
          categoryAddedDate: categoryAddedDate,
          primaryTableName: selectedTable.name,
          primaryTableId: selectedTable.id,
          categoryType: categoryType,
        };

        itemsMap.set(normalizedId, finalItem);
      });

      return Array.from(itemsMap.values());
    },
    [globalCategories, tables, globalCrmData, globalPromData]
  );

  // Фильтрованные данные для категорий
  const getCategoryFilteredData = useCallback(
    (categoryType) => {
      let filtered = getCategoryData(categoryType);

      // Быстрая фильтрация по поиску первой
      if (globalViewFilters.searchId.trim()) {
        const searchTerm = normalizeId(globalViewFilters.searchId);
        filtered = filtered.filter((item) =>
          item.normalizedId
            ? item.normalizedId.includes(searchTerm)
            : normalizeId(item.id).includes(searchTerm)
        );
      }

      // Простые boolean фильтры
      if (globalViewFilters.showOnlyProm) {
        filtered = filtered.filter(
          (item) =>
            item.promPrice !== null &&
            item.promPrice !== undefined &&
            item.promPrice > 0
        );
      }

      if (globalViewFilters.hideCrmStockZero) {
        filtered = filtered.filter((item) => item.crmStock !== 0);
      }

      if (globalViewFilters.hideCrmStockLowSix) {
        filtered = filtered.filter(
          (item) => item.crmStock === null || item.crmStock >= 6
        );
      }

      // Диапазонные фильтры
      Object.entries(globalViewFilters.rangeFilters).forEach(
        ([field, range]) => {
          if (range.min !== "" || range.max !== "") {
            const min = range.min !== "" ? parseFloat(range.min) : -Infinity;
            const max = range.max !== "" ? parseFloat(range.max) : Infinity;

            filtered = filtered.filter((item) => {
              let value = item[field];

              if (field === "crmStock" && value === null) return true;
              if ((field === "crmPrice" || field === "promPrice") && !value)
                value = 0;
              if (value === null || value === undefined) value = 0;
              return value >= min && value <= max;
            });
          }
        }
      );

      return filtered;
    },
    [getCategoryData, globalViewFilters]
  );

  // Сортированные данные для категорий
  const getCategorySortedData = useCallback(
    (categoryType) => {
      let sorted = [...getCategoryFilteredData(categoryType)];

      if (!globalViewFilters.sortConfig.key) {
        return sorted;
      }

      return sorted.sort((a, b) => {
        const aValue = a[globalViewFilters.sortConfig.key];
        const bValue = b[globalViewFilters.sortConfig.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === "number" && typeof bValue === "number") {
          return globalViewFilters.sortConfig.direction === "asc"
            ? aValue - bValue
            : bValue - aValue;
        }
        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();
        if (globalViewFilters.sortConfig.direction === "asc") {
          return aString < bString ? -1 : aString > bString ? 1 : 0;
        } else {
          return aString > bString ? -1 : aString < bString ? 1 : 0;
        }
      });
    },
    [getCategoryFilteredData, globalViewFilters.sortConfig]
  );

  // Пагинированные данные для категорий
  const getCategoryPaginatedData = useCallback(
    (categoryType) => {
      const sortedData = getCategorySortedData(categoryType);
      const startIndex =
        (globalViewFilters.currentPage - 1) * globalViewFilters.itemsPerPage;
      return sortedData.slice(
        startIndex,
        startIndex + globalViewFilters.itemsPerPage
      );
    },
    [
      getCategorySortedData,
      globalViewFilters.currentPage,
      globalViewFilters.itemsPerPage,
    ]
  );

  // Общее количество страниц для категорий
  const getCategoryTotalPages = useCallback(
    (categoryType) => {
      return Math.ceil(
        getCategorySortedData(categoryType).length /
          globalViewFilters.itemsPerPage
      );
    },
    [getCategorySortedData, globalViewFilters.itemsPerPage]
  );

  // Стартовый индекс для категорий
  const getCategoryStartIndex = useCallback(() => {
    return (globalViewFilters.currentPage - 1) * globalViewFilters.itemsPerPage;
  }, [globalViewFilters.currentPage, globalViewFilters.itemsPerPage]);

  // Обновлённая функция для изменения комиссии
  const updateItemCommission = (itemId, newCommission) => {
    const commission = parseFloat(newCommission) || 0;
    const normalizedId = normalizeId(itemId);

    setGlobalCommissions((prev) => ({
      ...prev,
      [normalizedId]: commission,
    }));

    let foundItem = null;
    let foundTable = null;

    if (activeTable) {
      foundItem = activeTable.data.find((item) => item.id === itemId);
      foundTable = activeTable;
    } else {
      for (const table of tables) {
        const item = table.data.find((item) => item.id === itemId);
        if (item) {
          foundItem = item;
          foundTable = table;
          break;
        }
      }
    }

    if (!foundItem) return;

    const totalCost = calculateTotalCost(foundItem.baseCost, commission);
    const changes = {
      commission,
      totalCost,
      markup50_12: calculateMarkup(totalCost, 50),
      markup10: calculateMarkup(totalCost, 10),
      markup20: calculateMarkup(totalCost, 20),
      markup30: calculateMarkup(totalCost, 30),
      markup40: calculateMarkup(totalCost, 40),
      markup50: calculateMarkup(totalCost, 50),
      markup60: calculateMarkup(totalCost, 60),
      markup70: calculateMarkup(totalCost, 70),
      markup80: calculateMarkup(totalCost, 80),
      markup90: calculateMarkup(totalCost, 90),
      markup100: calculateMarkup(totalCost, 100),
    };

    updateGlobalItemChange(itemId, changes);
  };

  const updateItemPrice = (originalIndex, newPrice) => {
    if (!activeTable || !newPrice || isNaN(parseFloat(newPrice))) return;
    const originalItem = activeTable.data[originalIndex];
    const price = parseFloat(newPrice);

    const priceChange = {
      date: new Date(),
      price,
      tableName: activeTable.name,
      tableId: activeTable.id,
      previousPrice:
        originalItem.priceHistory && originalItem.priceHistory.length > 0
          ? originalItem.priceHistory[originalItem.priceHistory.length - 1]
              .price
          : null,
    };

    const newPriceHistory = [...(originalItem.priceHistory || []), priceChange];
    updateGlobalItemChange(originalItem.id, {
      newPrice: price,
      priceHistory: newPriceHistory,
    });

    setNewPriceInputs((prev) => {
      const updated = { ...prev };
      delete updated[originalItem.id];
      return updated;
    });

    addNotification(`Цена изменена для ${originalItem.id}!`, "success");
  };

  // Альтернативная функция изменения цены для глобальных представлений
  const updateGlobalItemPrice = (itemId, newPrice) => {
    if (!newPrice || isNaN(parseFloat(newPrice))) return;

    let foundItem = null;
    let foundTable = null;

    for (const table of tables) {
      const item = table.data.find((item) => item.id === itemId);
      if (item) {
        foundItem = item;
        foundTable = table;
        break;
      }
    }

    if (!foundItem || !foundTable) return;

    const price = parseFloat(newPrice);

    let tableNameForHistory = foundTable.name;
    if (currentSection === "price_changed_global") {
      tableNameForHistory = "Измененные цены";
    } else if (currentSection === "commented_global") {
      tableNameForHistory = "Комментарии";
    }

    const priceChange = {
      date: new Date(),
      price,
      tableName: tableNameForHistory,
      tableId: foundTable.id,
      previousPrice:
        foundItem.priceHistory && foundItem.priceHistory.length > 0
          ? foundItem.priceHistory[foundItem.priceHistory.length - 1].price
          : null,
    };

    const newPriceHistory = [...(foundItem.priceHistory || []), priceChange];
    updateGlobalItemChange(itemId, {
      newPrice: price,
      priceHistory: newPriceHistory,
    });

    setNewPriceInputs((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });

    addNotification(`Цена изменена для ${itemId}!`);
  };

  const handlePriceInputChange = (itemId, value) => {
    setNewPriceInputs((prev) => ({ ...prev, [itemId]: value }));
  };

  const confirmPriceChange = (itemId) => {
    const inputValue = newPriceInputs[itemId];
    if (inputValue && !isNaN(parseFloat(inputValue))) {
      if (currentSection === "table" && activeTable) {
        const originalIndex = activeTable.data.findIndex(
          (dataItem) => dataItem.id === itemId
        );
        if (originalIndex !== -1) updateItemPrice(originalIndex, inputValue);
      } else {
        updateGlobalItemPrice(itemId, inputValue);
      }
    }
  };

  const addComment = (itemId, commentText = null) => {
    const text = commentText || newCommentInput;
    if (!text || !text.trim()) return;

    let foundTable = activeTable;
    if (!foundTable) {
      foundTable = tables.find((table) =>
        table.data.some((item) => item.id === itemId)
      );
    }

    if (!foundTable) return;

    const item = foundTable.data.find((item) => item.id === itemId);
    if (!item) return;

    let tableNameForComment = foundTable.name;
    if (currentSection === "price_changed_global") {
      tableNameForComment = "Измененные цены";
    } else if (currentSection === "commented_global") {
      tableNameForComment = "Комментарии";
    }

    const newComment = {
      id: Date.now(),
      text: text.trim(),
      date: new Date(),
      tableName: tableNameForComment,
      tableId: foundTable.id,
    };
    const newComments = [...(item.comments || []), newComment];
    updateGlobalItemChange(itemId, { comments: newComments });

    if (showComments && showComments.id === itemId) {
      setShowComments({ ...showComments, comments: newComments });
    }
    setNewCommentInput("");
  };

  const deleteComment = (itemId, commentId) => {
    let foundTable = activeTable;
    if (!foundTable) {
      foundTable = tables.find((table) =>
        table.data.some((item) => item.id === itemId)
      );
    }

    if (!foundTable) return;

    const item = foundTable.data.find((item) => item.id === itemId);
    if (!item) return;

    const updatedComments = item.comments.filter(
      (comment) => comment.id !== commentId
    );
    updateGlobalItemChange(itemId, { comments: updatedComments });

    if (showComments && showComments.id === itemId) {
      setShowComments({ ...showComments, comments: updatedComments });
    }
  };

  const getRowColors = (item) => {
    const normalizedId = normalizeId(item.id);
    const hasChangedPrice = item.priceHistory && item.priceHistory.length > 0;
    const hasComments = item.comments && item.comments.length > 0;
    const crmStock = item.crmStock;

    // Проверяем принадлежность к новым категориям
    const isNew = globalCategories.new.has(normalizedId);
    const isOptimization = globalCategories.optimization.has(normalizedId);
    const isAB = globalCategories.ab.has(normalizedId);
    const isCSale = globalCategories.c_sale.has(normalizedId);
    const isOffSeason = globalCategories.off_season.has(normalizedId);
    const isUnprofitable = globalCategories.unprofitable.has(normalizedId);

    // Приоритет цветов (сверху вниз - высший приоритет)
    if (hasChangedPrice && hasComments)
      return { backgroundColor: "#4a2c4a" }; // Фиолетовый - цена + комменты
    else if (hasChangedPrice)
      return { backgroundColor: "#2c4a2c" }; // Зеленый - только цена
    else if (hasComments)
      return { backgroundColor: "#1a2f3a" }; // Синий - только комменты
    else if (isNew)
      return { backgroundColor: "#1a4a1a" }; // Темно-зеленый - Новый
    else if (isOptimization)
      return { backgroundColor: "#4a4a1a" }; // Желто-зеленый - Оптимизация
    else if (isAB) return { backgroundColor: "#1a1a4a" }; // Темно-синий - A/B
    else if (isCSale)
      return { backgroundColor: "#4a1a4a" }; // Темно-фиолетовый - С-Продажа
    else if (isOffSeason)
      return { backgroundColor: "#4a3a1a" }; // Коричневый - Несезон
    else if (isUnprofitable)
      return { backgroundColor: "#3a1a1a" }; // Темно-красный - Нерентабельные
    else if (crmStock !== null && crmStock === 0)
      return { backgroundColor: "#4a2c2c" }; // Красный - нулевой остаток
    else if (crmStock !== null && crmStock > 0 && crmStock < 6)
      return { backgroundColor: "#4a3d2c" }; // Оранжевый - низкий остаток
    else return { backgroundColor: "transparent" };
  };

  // Функции для обновления глобальных фильтров
  const updateGlobalRangeFilter = (field, type, value) => {
    const newRangeFilters = {
      ...globalViewFilters.rangeFilters,
      [field]: { ...globalViewFilters.rangeFilters[field], [type]: value },
    };
    setGlobalViewFilters((prev) => ({
      ...prev,
      rangeFilters: newRangeFilters,
    }));
  };

  const updateGlobalDateFilter = (type, value) => {
    const newDateFilter = { ...globalViewFilters.dateFilter, [type]: value };
    setGlobalViewFilters((prev) => ({ ...prev, dateFilter: newDateFilter }));
  };

  const updateGlobalDateCommentFilter = (type, value) => {
    const newDateCommentFilter = {
      ...globalViewFilters.dateCommentFilter,
      [type]: value,
    };
    setGlobalViewFilters((prev) => ({
      ...prev,
      dateCommentFilter: newDateCommentFilter,
    }));
  };

  const clearAllGlobalFilters = () => {
    setGlobalViewFilters((prev) => ({
      ...prev,
      searchId: "",
      currentPage: 1,
      showOnlyProm: false,
      hideCrmStockZero: false,
      hideCrmStockLowSix: false,
      rangeFilters: {
        baseCost: { min: "", max: "" },
        lastPrice: { min: "", max: "" },
        crmStock: { min: "", max: "" },
        crmPrice: { min: "", max: "" },
        promPrice: { min: "", max: "" },
      },
      dateFilter: { from: "", to: "" },
      dateCommentFilter: { from: "", to: "" },
    }));
  };

  // Функция для получения статистики примененных фильтров
  const getGlobalFilterStats = () => {
    const stats = [];
    if (globalViewFilters.showOnlyProm) stats.push("Только PROM");
    if (globalViewFilters.hideCrmStockZero) stats.push("CRM ≠ 0");
    if (globalViewFilters.hideCrmStockLowSix) stats.push("CRM ≥ 6");
    if (globalViewFilters.searchId.trim())
      stats.push(`ID: "${globalViewFilters.searchId}"`);

    const rangeStats = Object.entries(globalViewFilters.rangeFilters)
      .filter(([_, range]) => range.min !== "" || range.max !== "")
      .map(([field, range]) => {
        const fieldNames = {
          baseCost: "Себест.",
          lastPrice: "Посл.цена",
          crmStock: "Остаток",
          crmPrice: "CRM цена",
          promPrice: "PROM цена",
        };
        const name = fieldNames[field] || field;
        if (range.min !== "" && range.max !== "")
          return `${name}: ${range.min}-${range.max}`;
        if (range.min !== "") return `${name}: ≥${range.min}`;
        if (range.max !== "") return `${name}: ≤${range.max}`;
      });

    stats.push(...rangeStats);
    return stats;
  };

  const hasActiveGlobalFilters = () => {
    return (
      globalViewFilters.searchId.trim() !== "" ||
      globalViewFilters.showOnlyProm ||
      globalViewFilters.hideCrmStockZero ||
      globalViewFilters.hideCrmStockLowSix ||
      Object.values(globalViewFilters.rangeFilters).some(
        (filter) => filter.min !== "" || filter.max !== ""
      ) ||
      globalViewFilters.dateFilter.from !== "" ||
      globalViewFilters.dateFilter.to !== "" ||
      globalViewFilters.dateCommentFilter.from !== "" ||
      globalViewFilters.dateCommentFilter.to !== ""
    );
  };

  const updateRangeFilter = (field, type, value) => {
    const newRangeFilters = {
      ...currentFilters.rangeFilters,
      [field]: { ...currentFilters.rangeFilters[field], [type]: value },
    };
    updateTableFilters({ rangeFilters: newRangeFilters });
  };

  const clearAllFilters = () => {
    updateTableFilters({
      searchId: "",
      priceChangeFilter: "all",
      showOnlyProm: false,
      hiddenCrmCategories: ["93", "55", "52", "46", "16", "000000025"],
      hideCrmStockZero: false,
      hideCrmStockLowSix: false,
      currentPage: 1,
      sortConfig: { key: null, direction: "asc" },
      rangeFilters: {
        baseCost: { min: "", max: "" },
        stock: { min: "", max: "" },
        daysStock: { min: "", max: "" },
        salesMonth: { min: "", max: "" },
        applicationsMonth: { min: "", max: "" },
        redemptionMonth: { min: "", max: "" },
        redemptionMonthPercent: { min: "", max: "" },
        sales2Weeks: { min: "", max: "" },
        applications2Weeks: { min: "", max: "" },
        redemption2Weeks: { min: "", max: "" },
        redemption2WeeksPercent: { min: "", max: "" },
        crmStock: { min: "", max: "" },
        crmPrice: { min: "", max: "" },
        promPrice: { min: "", max: "" },
      },
    });
  };

  const hasActiveFilters = () => {
    return (
      currentFilters.searchId.trim() !== "" ||
      currentFilters.priceChangeFilter !== "all" ||
      currentFilters.showOnlyProm ||
      currentFilters.hiddenCrmCategories.length > 0 ||
      currentFilters.hideCrmStockZero ||
      currentFilters.hideCrmStockLowSix ||
      Object.values(currentFilters.rangeFilters).some(
        (filter) => filter.min !== "" || filter.max !== ""
      )
    );
  };

  const closeTable = async (tableId, e) => {
    e.stopPropagation();

    if (isDeletingTable === tableId) return;

    try {
      setIsDeletingTable(tableId);
      console.log(`🗑️ Удаление таблицы ${tableId}...`);

      const response = await fetch(`/api/tables/${tableId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();
      console.log(`✅ Таблица удалена с сервера:`, result);

      setTables((prev) => prev.filter((table) => table.id !== tableId));

      if (activeTableId === tableId) {
        const remainingTables = tables.filter((table) => table.id !== tableId);
        setActiveTableId(
          remainingTables.length > 0 ? remainingTables[0].id : null
        );
        if (remainingTables.length === 0) setCurrentSection("home");
      }

      setTableXmlData((prev) => {
        const updated = { ...prev };
        delete updated[tableId];
        return updated;
      });

      setTableXmlLoadingStatus((prev) => {
        const updated = { ...prev };
        delete updated[tableId];
        return updated;
      });

      addNotification(
        `✅ Таблица "${result.deletedTableName || "неизвестная"}" удалена!`
      );
    } catch (error) {
      console.error("❌ Ошибка удаления таблицы:", error);
      addNotification(`❌ Ошибка удаления таблицы: ${error.message}`);
      setTimeout(() => addNotification(null), 5000);
    } finally {
      setIsDeletingTable(null);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      // Попытка использовать современный Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        addNotification(`ID ${text} скопирован!`, "success");
        return;
      }

      // Fallback метод для старых браузеров или HTTP
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand("copy");
        if (successful) {
          addNotification(`ID ${text} скопирован!`, "success");
        } else {
          throw new Error("document.execCommand не сработал");
        }
      } catch (err) {
        console.error("Fallback копирование не удалось: ", err);
        addNotification(`Скопируйте вручную: ${text}`, "info");
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error("Ошибка копирования: ", err);
      addNotification(`Скопируйте вручную: ${text}`, "info");
    }
  };

  const handleCrmCategoryToggle = (categoryId) => {
    const newHiddenCategories = currentFilters.hiddenCrmCategories.includes(
      categoryId
    )
      ? currentFilters.hiddenCrmCategories.filter((id) => id !== categoryId)
      : [...currentFilters.hiddenCrmCategories, categoryId];
    updateTableFilters({ hiddenCrmCategories: newHiddenCategories });
  };

  // Функция для рендера глобальных фильтров
  const renderGlobalFilters = (viewType) => {
    return (
      <div className="global-filters">
        <div className="global-filters-header">
          <h5 className="global-filters-title">
            {viewType === "price_changed"
              ? "Фильтры для товаров с изменениями цен:"
              : "Фильтры для товаров с комментариями:"}
          </h5>
        </div>

        {/* Фильтры по датам и таблицам */}
        <div className="global-date-filters">
          <div className="date-filter">
            <div className="date-filter-title date-filter-title--price">
              📅 Фильтр по дате последнего изменения:
            </div>
            <div className="date-filter-inputs">
              <div className="date-input-group">
                <span className="date-input-label">От:</span>
                <input
                  type="date"
                  value={globalViewFilters.dateFilter.from}
                  onChange={(e) =>
                    updateGlobalDateFilter("from", e.target.value)
                  }
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <span className="date-input-label">До:</span>
                <input
                  type="date"
                  value={globalViewFilters.dateFilter.to}
                  onChange={(e) => updateGlobalDateFilter("to", e.target.value)}
                  className="date-input"
                />
              </div>
              {(globalViewFilters.dateFilter.from ||
                globalViewFilters.dateFilter.to) && (
                <button
                  onClick={() =>
                    setGlobalViewFilters((prev) => ({
                      ...prev,
                      dateFilter: { from: "", to: "" },
                    }))
                  }
                  className="date-clear"
                >
                  Очистить
                </button>
              )}
            </div>
          </div>

          <div className="date-filter">
            <div className="date-filter-title date-filter-title--comment">
              💬 Фильтр по дате последнего комментария:
            </div>
            <div className="date-filter-inputs">
              <div className="date-input-group">
                <span className="date-input-label">От:</span>
                <input
                  type="date"
                  value={globalViewFilters.dateCommentFilter.from}
                  onChange={(e) =>
                    updateGlobalDateCommentFilter("from", e.target.value)
                  }
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <span className="date-input-label">До:</span>
                <input
                  type="date"
                  value={globalViewFilters.dateCommentFilter.to}
                  onChange={(e) =>
                    updateGlobalDateCommentFilter("to", e.target.value)
                  }
                  className="date-input"
                />
              </div>
              {(globalViewFilters.dateCommentFilter.from ||
                globalViewFilters.dateCommentFilter.to) && (
                <button
                  onClick={() =>
                    setGlobalViewFilters((prev) => ({
                      ...prev,
                      dateCommentFilter: { from: "", to: "" },
                    }))
                  }
                  className="date-clear"
                >
                  Очистить
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Фильтры по диапазонам */}
        <div className="range-filters-grid">
          {[
            { key: "baseCost", label: "Себестоимость" },
            { key: "lastPrice", label: "Посл. цена", color: "last-price" },
            { key: "crmStock", label: "Остаток CRM", color: "crm-stock" },
            { key: "crmPrice", label: "Цена CRM", color: "crm-price" },
            { key: "promPrice", label: "Цена PROM", color: "prom-price" },
          ].map((filter) => (
            <div key={filter.key} className="range-filter">
              <div
                className={`range-filter-label range-filter-label--${
                  filter.color || "default"
                }`}
              >
                {filter.label}
              </div>
              <div className="range-filter-inputs">
                <input
                  type="number"
                  placeholder="От"
                  value={globalViewFilters.rangeFilters[filter.key].min}
                  onChange={(e) =>
                    updateGlobalRangeFilter(filter.key, "min", e.target.value)
                  }
                  className="range-input"
                />
                <span className="range-separator">—</span>
                <input
                  type="number"
                  placeholder="До"
                  value={globalViewFilters.rangeFilters[filter.key].max}
                  onChange={(e) =>
                    updateGlobalRangeFilter(filter.key, "max", e.target.value)
                  }
                  className="range-input"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Функция для рендера глобальной таблицы с новыми колонками
  const renderGlobalTable = (
    dataToRender,
    startIdx,
    showTableNames = false
  ) => {
    return (
      <div
        ref={tableContainerRef}
        className="table-container global-table"
        data-table-container="true"
      >
        <table className="main-table">
          <thead className="table-header">
            <tr className="table-header-row">
              <th className="table-header-cell">#</th>
              {[
                { key: "id", label: "ID" },
                {
                  key: "lastCommentDate",
                  label: "Дата посл.\nкомм.",
                  color: "comment",
                },
                {
                  key: "lastCommentText",
                  label: "Посл.\nкомм.",
                  color: "comment",
                },
                { key: "baseCost", label: "Себест." },
                { key: "commission", label: "Комиссия\n(%)" },
                { key: "totalCost", label: "Тотал\nсебест.", color: "total" },
                { key: "crmStock", label: "Остаток\nCRM", color: "crm" },
                { key: "crmPrice", label: "Цена\nCRM", color: "price" },
                { key: "promPrice", label: "Цена\nPROM", color: "prom" },
                { key: "lastPrice", label: "Посл.\nцена", color: "last-price" },
                { key: null, label: "Новая\nцена" },
                {
                  key: "lastPriceChangeDate",
                  label: "Дата посл.\nизм. цены",
                  color: "last-price",
                },
              ].map((col) => (
                <th
                  key={col.key || col.label}
                  className={`table-header-cell table-header-cell--${
                    col.color || "default"
                  }`}
                  onClick={
                    col.key ? () => handleGlobalSort(col.key) : undefined
                  }
                >
                  {col.label}{" "}
                  {col.key &&
                    globalViewFilters.sortConfig.key === col.key &&
                    (globalViewFilters.sortConfig.direction === "asc"
                      ? "↑"
                      : globalViewFilters.sortConfig.direction === "desc"
                      ? "↓"
                      : "")}
                </th>
              ))}
              <th className="table-header-cell table-header-cell--actions">
                Градация
              </th>
            </tr>
          </thead>
          <tbody>
            {dataToRender.map((item, index) => {
              const mainRowKey = `${item.id}-${startIdx + index}`;
              const isInfoExpanded = expandedInfoRows.has(item.id);
              const expandedTables = expandedInfoTables[item.id] || new Set();
              const isSelected = selectedItemId === item.id;
              const rowColors = getRowColors(item);

              const getRowClassName = () => {
                let className = "table-row";
                if (isSelected) className += " table-row--selected";
                if (rowColors.backgroundColor === "#4a2c4a")
                  className += " table-row--price-and-comment";
                else if (rowColors.backgroundColor === "#2c4a2c")
                  className += " table-row--price-only";
                else if (rowColors.backgroundColor === "#1a2f3a")
                  className += " table-row--comment-only";
                else if (rowColors.backgroundColor === "#4a2c2c")
                  className += " table-row--crm-zero";
                else if (rowColors.backgroundColor === "#4a3d2c")
                  className += " table-row--crm-low";
                else className += " table-row--transparent";
                return className;
              };

              return (
                <React.Fragment key={mainRowKey}>
                  <tr
                    onClick={() => handleRowClick(item.id)}
                    className={getRowClassName()}
                  >
                    <td className="table-cell table-cell--center">
                      {startIdx + index + 1}
                      {((item.priceHistory && item.priceHistory.length > 0) ||
                        (item.comments && item.comments.length > 0)) && (
                        <span
                          className={`indicator-star ${
                            item.priceHistory &&
                            item.priceHistory.length > 0 &&
                            item.comments &&
                            item.comments.length > 0
                              ? "indicator-star--purple"
                              : item.priceHistory &&
                                item.priceHistory.length > 0
                              ? "indicator-star--green"
                              : "indicator-star--blue"
                          }`}
                        >
                          ★
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="cell-content">
                          <span
                            className={`item-id ${
                              item.priceHistory &&
                              item.priceHistory.length > 0 &&
                              item.comments &&
                              item.comments.length > 0
                                ? "item-id--price-and-comment"
                                : item.priceHistory &&
                                  item.priceHistory.length > 0
                                ? "item-id--price-only"
                                : item.comments && item.comments.length > 0
                                ? "item-id--comment-only"
                                : "item-id--default"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.id);
                            }}
                          >
                            {item.id}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.id);
                            }}
                            className="mini-button mini-button--copy"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="cell-buttons">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategoriesExpansion(item.id);
                            }}
                            className="mini-button mini-button--category"
                          >
                            {expandedCategoriesRows.has(item.id) ? "▲" : "▼"}{" "}
                            Категории
                          </button>

                          {/* Активные категории - всегда видны */}
                          {isInCategory(item.id, "new") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "new");
                              }}
                              className="mini-button mini-button--new active"
                            >
                              Новый
                            </button>
                          )}
                          {isInCategory(item.id, "optimization") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "optimization");
                              }}
                              className="mini-button mini-button--optimization active"
                            >
                              Оптим
                            </button>
                          )}
                          {isInCategory(item.id, "ab") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "ab");
                              }}
                              className="mini-button mini-button--ab active"
                            >
                              A/B
                            </button>
                          )}
                          {isInCategory(item.id, "c_sale") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "c_sale");
                              }}
                              className="mini-button mini-button--c-sale active"
                            >
                              С-Прод
                            </button>
                          )}
                          {isInCategory(item.id, "off_season") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "off_season");
                              }}
                              className="mini-button mini-button--off-season active"
                            >
                              Несез
                            </button>
                          )}
                          {isInCategory(item.id, "unprofitable") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "unprofitable");
                              }}
                              className="mini-button mini-button--unprofitable active"
                            >
                              Нерент
                            </button>
                          )}

                          {/* Неактивные категории - только в раскрытом меню */}
                          {expandedCategoriesRows.has(item.id) && (
                            <>
                              {!isInCategory(item.id, "new") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(item.id, "new");
                                  }}
                                  className="mini-button mini-button--new"
                                >
                                  Новый
                                </button>
                              )}
                              {!isInCategory(item.id, "optimization") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(
                                      item.id,
                                      "optimization"
                                    );
                                  }}
                                  className="mini-button mini-button--optimization"
                                >
                                  Оптим
                                </button>
                              )}
                              {!isInCategory(item.id, "ab") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(item.id, "ab");
                                  }}
                                  className="mini-button mini-button--ab"
                                >
                                  A/B
                                </button>
                              )}
                              {!isInCategory(item.id, "c_sale") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(item.id, "c_sale");
                                  }}
                                  className="mini-button mini-button--c-sale"
                                >
                                  С-Прод
                                </button>
                              )}
                              {!isInCategory(item.id, "off_season") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(item.id, "off_season");
                                  }}
                                  className="mini-button mini-button--off-season"
                                >
                                  Несез
                                </button>
                              )}
                              {!isInCategory(item.id, "unprofitable") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(
                                      item.id,
                                      "unprofitable"
                                    );
                                  }}
                                  className="mini-button mini-button--unprofitable"
                                >
                                  Нерент
                                </button>
                              )}
                            </>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowComments(item);
                            }}
                            className={`mini-button mini-button--comment ${
                              item.comments && item.comments.length > 0
                                ? "mini-button--comment-active"
                                : "mini-button--comment-inactive"
                            }`}
                          >
                            💬
                            {item.comments && item.comments.length > 0
                              ? item.comments.length
                              : "+"}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell table-cell--comment-date">
                      {item.lastCommentDate
                        ? new Date(item.lastCommentDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="table-cell table-cell--comment-text">
                      {item.lastCommentText || "—"}
                    </td>
                    <td className="table-cell table-cell--cost">
                      {(item.baseCost || 0).toFixed(2)}
                    </td>
                    <td
                      className="table-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="number"
                        value={item.commission || 0}
                        onChange={(e) =>
                          updateItemCommission(item.id, e.target.value)
                        }
                        className="commission-input"
                      />
                    </td>
                    <td className="table-cell table-cell--total">
                      {(item.totalCost || 0).toFixed(2)}
                    </td>
                    <td className="table-cell table-cell--crm-stock">
                      {item.crmStock !== null && item.crmStock !== undefined
                        ? item.crmStock
                        : "—"}
                    </td>
                    <td className="table-cell table-cell--crm-price">
                      {item.crmPrice
                        ? (typeof item.crmPrice === "object"
                            ? item.crmPrice.price
                            : item.crmPrice
                          ).toFixed(2)
                        : "—"}
                    </td>
                    <td className="table-cell table-cell--prom-price">
                      {item.promPrice ? item.promPrice.toFixed(2) : "—"}
                    </td>
                    <td className="table-cell table-cell--last-price">
                      {item.lastPrice ? item.lastPrice.toFixed(2) : "—"}
                    </td>
                    <td
                      className="table-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="price-inputs">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Цена"
                          value={newPriceInputs[item.id] || ""}
                          onChange={(e) =>
                            handlePriceInputChange(item.id, e.target.value)
                          }
                          className="price-input"
                        />
                        <button
                          onClick={() => confirmPriceChange(item.id)}
                          disabled={
                            !newPriceInputs[item.id] ||
                            isNaN(parseFloat(newPriceInputs[item.id]))
                          }
                          className={`price-confirm ${
                            !newPriceInputs[item.id] ||
                            isNaN(parseFloat(newPriceInputs[item.id]))
                              ? "price-confirm--disabled"
                              : "price-confirm--enabled"
                          }`}
                        >
                          ✓
                        </button>
                      </div>
                      {item.priceHistory && item.priceHistory.length > 0 && (
                        <div className="price-history">
                          <div className="price-history-current">
                            Последняя:{" "}
                            {(
                              item.priceHistory[item.priceHistory.length - 1]
                                .price || 0
                            ).toFixed(2)}{" "}
                            ₴
                          </div>
                          <div className="price-history-date">
                            {new Date(
                              item.priceHistory[
                                item.priceHistory.length - 1
                              ].date
                            ).toLocaleDateString()}
                          </div>
                          {item.priceHistory.length > 1 && (
                            <div
                              className="price-history-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPriceHistory(item);
                              }}
                            >
                              История: {item.priceHistory.length} изм.
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="table-cell table-cell--price-date">
                      {item.lastPriceChangeDate
                        ? new Date(
                            item.lastPriceChangeDate
                          ).toLocaleDateString()
                        : "—"}
                    </td>
                    <td
                      className="table-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="info-price-buttons">
                        <button
                          onClick={() => togglePriceExpansion(item.id)}
                          className="mini-button mini-button--actions"
                        >
                          {expandedPriceRows.has(item.id) ? "▲" : "▼"} Цены
                        </button>
                        <button
                          onClick={() => toggleInfoExpansion(item.id)}
                          className="mini-button mini-button--info"
                        >
                          {expandedInfoRows.has(item.id) ? "▲" : "▼"} Инфо
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isInfoExpanded && expandedTables.size > 0 && (
                    <>
                      {/* Заголовок обычных таблиц */}
                      <tr className="info-table-header-row">
                        <th className="table-header-cell">#</th>
                        <th className="table-header-cell">ID</th>
                        <th className="table-header-cell">Себест.</th>
                        <th className="table-header-cell">Остаток</th>
                        <th className="table-header-cell">
                          Запас
                          <br />
                          дн.
                        </th>
                        <th className="table-header-cell">
                          Продаж
                          <br />
                          /мес
                        </th>
                        <th className="table-header-cell">
                          Продаж
                          <br />
                          /2нед
                        </th>
                        <th className="table-header-cell table-header-cell--applications">
                          Заявки
                          <br />
                          /мес
                        </th>
                        <th className="table-header-cell table-header-cell--applications">
                          Заявки
                          <br />
                          /2нед
                        </th>
                        <th className="table-header-cell">
                          Комиссия
                          <br />
                          (%)
                        </th>
                        <th className="table-header-cell table-header-cell--total">
                          Тотал
                          <br />
                          себест.
                        </th>
                        <th className="table-header-cell table-header-cell--crm">
                          Остаток
                          <br />
                          CRM
                        </th>
                        <th className="table-header-cell table-header-cell--price">
                          Цена
                          <br />
                          CRM
                        </th>
                        <th className="table-header-cell table-header-cell--prom">
                          Цена
                          <br />
                          PROM
                        </th>
                      </tr>

                      {/* Строки из других таблиц */}
                      {(() => {
                        const otherTablesData = getItemDataFromOtherTables(
                          item.id,
                          null
                        );
                        return Array.from(expandedTables).map((tableId) => {
                          const tableInfo = otherTablesData.find(
                            (t) => t.tableId === tableId
                          );
                          if (!tableInfo || !tableInfo.data) {
                            return (
                              <tr
                                key={`${item.id}-${tableId}-no-data`}
                                className="info-no-data-row"
                              >
                                <td
                                  colSpan="10"
                                  className="table-cell table-cell--no-data"
                                >
                                  <span className="info-no-data-message">
                                    ID "{item.id}" не найден в таблице "
                                    {tableInfo?.tableName || "Unknown"}"
                                  </span>
                                </td>
                              </tr>
                            );
                          }

                          const otherRowColors = getRowColors(tableInfo.data);
                          const getOtherRowClassName = () => {
                            let className = "table-row info-row-from-table";
                            if (otherRowColors.backgroundColor === "#4a2c4a")
                              className += " table-row--price-and-comment";
                            else if (
                              otherRowColors.backgroundColor === "#2c4a2c"
                            )
                              className += " table-row--price-only";
                            else if (
                              otherRowColors.backgroundColor === "#1a2f3a"
                            )
                              className += " table-row--comment-only";
                            else if (
                              otherRowColors.backgroundColor === "#4a2c2c"
                            )
                              className += " table-row--crm-zero";
                            else if (
                              otherRowColors.backgroundColor === "#4a3d2c"
                            )
                              className += " table-row--crm-low";
                            else className += " table-row--transparent";
                            return className;
                          };

                          return (
                            <tr
                              key={`${item.id}-${tableId}-info`}
                              className={getOtherRowClassName()}
                            >
                              <td className="table-cell table-cell--center">
                                <span className="other-table-row-indicator">
                                  —
                                </span>
                              </td>
                              <td className="table-cell">
                                <div>
                                  <div className="cell-content">
                                    <span
                                      className={`item-id ${
                                        tableInfo.data.priceHistory &&
                                        tableInfo.data.priceHistory.length >
                                          0 &&
                                        tableInfo.data.comments &&
                                        tableInfo.data.comments.length > 0
                                          ? "item-id--price-and-comment"
                                          : tableInfo.data.priceHistory &&
                                            tableInfo.data.priceHistory.length >
                                              0
                                          ? "item-id--price-only"
                                          : tableInfo.data.comments &&
                                            tableInfo.data.comments.length > 0
                                          ? "item-id--comment-only"
                                          : "item-id--default"
                                      }`}
                                    >
                                      {tableInfo.data.id}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="table-cell table-cell--cost">
                                {(tableInfo.data.baseCost || 0).toFixed(2)}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.stock || 0}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.daysStock || 0}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.salesMonth || 0}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.sales2Weeks || 0}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.applicationsMonth !== null
                                  ? tableInfo.data.applicationsMonth || 0
                                  : "—"}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.applications2Weeks !== null
                                  ? tableInfo.data.applications2Weeks || 0
                                  : "—"}
                              </td>
                              <td className="table-cell">
                                <span className="commission-readonly">
                                  {tableInfo.data.commission || 0}
                                </span>
                              </td>
                              <td className="table-cell table-cell--total">
                                {(tableInfo.data.totalCost || 0).toFixed(2)}
                              </td>
                              <td className="table-cell table-cell--crm-stock">
                                {tableInfo.data.crmStock !== null &&
                                tableInfo.data.crmStock !== undefined
                                  ? tableInfo.data.crmStock
                                  : "—"}
                              </td>
                              <td className="table-cell table-cell--crm-price">
                                {tableInfo.data.crmPrice
                                  ? (typeof tableInfo.data.crmPrice === "object"
                                      ? tableInfo.data.crmPrice.price
                                      : tableInfo.data.crmPrice
                                    ).toFixed(2)
                                  : "—"}
                              </td>
                              <td className="table-cell table-cell--prom-price">
                                {tableInfo.data.promPrice
                                  ? tableInfo.data.promPrice.toFixed(2)
                                  : "—"}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </>
                  )}
                  {expandedPriceRows.has(item.id) && (
                    <tr className="price-expansion">
                      <td colSpan="14" className="price-expansion-cell">
                        <div className="price-grid">
                          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(
                            (percent) => (
                              <div
                                key={percent}
                                className="price-item"
                                style={{
                                  borderColor: getGradientColor(percent),
                                }}
                              >
                                <div
                                  className="price-percent"
                                  style={{ color: getGradientColor(percent) }}
                                >
                                  +{percent}%
                                </div>
                                <div className="price-value">
                                  {(item[`markup${percent}`] || 0).toFixed(2)} ₴
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {isInfoExpanded && (
                    <tr className="info-tables-selector">
                      <td colSpan="14" className="info-tables-selector-cell">
                        <div className="info-tables-header">
                          <h4 className="info-tables-title">
                            Выберите таблицы для сравнения с ID "{item.id}":
                          </h4>
                        </div>
                        <div className="info-tables-buttons">
                          {(() => {
                            const otherTablesData = getItemDataFromOtherTables(
                              item.id,
                              null
                            );
                            if (otherTablesData.length === 0) {
                              return (
                                <div className="info-empty">Таблиц нет</div>
                              );
                            }

                            return otherTablesData.map((tableInfo) => {
                              const isTableExpanded =
                                expandedInfoTables[item.id] &&
                                expandedInfoTables[item.id].has(
                                  tableInfo.tableId
                                );
                              return (
                                <button
                                  key={tableInfo.tableId}
                                  onClick={() =>
                                    toggleInfoTable(item.id, tableInfo.tableId)
                                  }
                                  className={`info-table-button ${
                                    isTableExpanded
                                      ? "info-table-button--active"
                                      : "info-table-button--inactive"
                                  } ${
                                    !tableInfo.data
                                      ? "info-table-button--no-data"
                                      : ""
                                  }`}
                                >
                                  <span className="info-table-button-name">
                                    {tableInfo.tableName}
                                  </span>
                                  <span className="info-table-button-date">
                                    {new Date(
                                      tableInfo.uploadTime
                                    ).toLocaleDateString()}
                                  </span>
                                  {!tableInfo.data && (
                                    <span className="info-table-button-no-data">
                                      ID не найден
                                    </span>
                                  )}
                                  <span className="info-table-button-toggle">
                                    {isTableExpanded ? "✓" : "+"}
                                  </span>
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Функция для рендера таблицы категорий с дополнительной колонкой
  const renderCategoryTable = (dataToRender, startIdx, categoryType) => {
    return (
      <div
        ref={tableContainerRef}
        className="table-container global-table category-table"
        data-table-container="true"
      >
        <table className="main-table">
          <thead className="table-header">
            <tr className="table-header-row">
              <th className="table-header-cell">#</th>
              {[
                { key: "id", label: "ID" },
                {
                  key: "categoryAddedDate",
                  label: "Дата доб.\nв катег.",
                  color: "comment",
                },
                {
                  key: "lastCommentDate",
                  label: "Дата посл.\nкомм.",
                  color: "comment",
                },
                {
                  key: "lastCommentText",
                  label: "Посл.\nкомм.",
                  color: "comment",
                },
                { key: "baseCost", label: "Себест." },
                { key: "commission", label: "Комиссия\n(%)" },
                { key: "totalCost", label: "Тотал\nсебест.", color: "total" },
                { key: "crmStock", label: "Остаток\nCRM", color: "crm" },
                { key: "crmPrice", label: "Цена\nCRM", color: "price" },
                { key: "promPrice", label: "Цена\nPROM", color: "prom" },
                { key: "lastPrice", label: "Посл.\nцена", color: "last-price" },
                { key: null, label: "Новая\nцена" },
                {
                  key: "lastPriceChangeDate",
                  label: "Дата посл.\nизм. цены",
                  color: "last-price",
                },
              ].map((col) => (
                <th
                  key={col.key || col.label}
                  className={`table-header-cell table-header-cell--${
                    col.color || "default"
                  }`}
                  onClick={
                    col.key ? () => handleGlobalSort(col.key) : undefined
                  }
                >
                  {col.label}{" "}
                  {col.key &&
                    globalViewFilters.sortConfig.key === col.key &&
                    (globalViewFilters.sortConfig.direction === "asc"
                      ? "↑"
                      : globalViewFilters.sortConfig.direction === "desc"
                      ? "↓"
                      : "")}
                </th>
              ))}
              <th className="table-header-cell table-header-cell--actions">
                Градация
              </th>
            </tr>
          </thead>
          <tbody>
            {dataToRender.map((item, index) => {
              const mainRowKey = `${item.id}-${startIdx + index}`;
              const isInfoExpanded = expandedInfoRows.has(item.id);
              const expandedTables = expandedInfoTables[item.id] || new Set();
              const isSelected = selectedItemId === item.id;
              const rowColors = getRowColors(item);

              const getRowClassName = () => {
                let className = "table-row";
                if (isSelected) className += " table-row--selected";
                if (rowColors.backgroundColor === "#4a2c4a")
                  className += " table-row--price-and-comment";
                else if (rowColors.backgroundColor === "#2c4a2c")
                  className += " table-row--price-only";
                else if (rowColors.backgroundColor === "#1a2f3a")
                  className += " table-row--comment-only";
                else if (rowColors.backgroundColor === "#4a2c2c")
                  className += " table-row--crm-zero";
                else if (rowColors.backgroundColor === "#4a3d2c")
                  className += " table-row--crm-low";
                else className += " table-row--transparent";
                return className;
              };

              return (
                <React.Fragment key={mainRowKey}>
                  <tr
                    onClick={() => handleRowClick(item.id)}
                    className={getRowClassName()}
                  >
                    <td className="table-cell table-cell--center">
                      {startIdx + index + 1}
                      {((item.priceHistory && item.priceHistory.length > 0) ||
                        (item.comments && item.comments.length > 0)) && (
                        <span
                          className={`indicator-star ${
                            item.priceHistory &&
                            item.priceHistory.length > 0 &&
                            item.comments &&
                            item.comments.length > 0
                              ? "indicator-star--purple"
                              : item.priceHistory &&
                                item.priceHistory.length > 0
                              ? "indicator-star--green"
                              : "indicator-star--blue"
                          }`}
                        >
                          ★
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="cell-content">
                          <span
                            className={`item-id ${
                              item.priceHistory &&
                              item.priceHistory.length > 0 &&
                              item.comments &&
                              item.comments.length > 0
                                ? "item-id--price-and-comment"
                                : item.priceHistory &&
                                  item.priceHistory.length > 0
                                ? "item-id--price-only"
                                : item.comments && item.comments.length > 0
                                ? "item-id--comment-only"
                                : "item-id--default"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.id);
                            }}
                          >
                            {item.id}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.id);
                            }}
                            className="mini-button mini-button--copy"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="cell-buttons">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategoriesExpansion(item.id);
                            }}
                            className="mini-button mini-button--category"
                          >
                            {expandedCategoriesRows.has(item.id) ? "▲" : "▼"}{" "}
                            Категории
                          </button>

                          {/* Активные категории - всегда видны */}
                          {isInCategory(item.id, "new") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "new");
                              }}
                              className="mini-button mini-button--new active"
                            >
                              Новый
                            </button>
                          )}
                          {isInCategory(item.id, "optimization") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "optimization");
                              }}
                              className="mini-button mini-button--optimization active"
                            >
                              Оптим
                            </button>
                          )}
                          {isInCategory(item.id, "ab") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "ab");
                              }}
                              className="mini-button mini-button--ab active"
                            >
                              A/B
                            </button>
                          )}
                          {isInCategory(item.id, "c_sale") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "c_sale");
                              }}
                              className="mini-button mini-button--c-sale active"
                            >
                              С-Прод
                            </button>
                          )}
                          {isInCategory(item.id, "off_season") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "off_season");
                              }}
                              className="mini-button mini-button--off-season active"
                            >
                              Несез
                            </button>
                          )}
                          {isInCategory(item.id, "unprofitable") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemInCategory(item.id, "unprofitable");
                              }}
                              className="mini-button mini-button--unprofitable active"
                            >
                              Нерент
                            </button>
                          )}

                          {/* Неактивные категории - только в раскрытом меню */}
                          {expandedCategoriesRows.has(item.id) && (
                            <>
                              {!isInCategory(item.id, "new") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(item.id, "new");
                                  }}
                                  className="mini-button mini-button--new"
                                >
                                  Новый
                                </button>
                              )}
                              {!isInCategory(item.id, "optimization") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(
                                      item.id,
                                      "optimization"
                                    );
                                  }}
                                  className="mini-button mini-button--optimization"
                                >
                                  Оптим
                                </button>
                              )}
                              {!isInCategory(item.id, "ab") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(item.id, "ab");
                                  }}
                                  className="mini-button mini-button--ab"
                                >
                                  A/B
                                </button>
                              )}
                              {!isInCategory(item.id, "c_sale") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(item.id, "c_sale");
                                  }}
                                  className="mini-button mini-button--c-sale"
                                >
                                  С-Прод
                                </button>
                              )}
                              {!isInCategory(item.id, "off_season") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(item.id, "off_season");
                                  }}
                                  className="mini-button mini-button--off-season"
                                >
                                  Несез
                                </button>
                              )}
                              {!isInCategory(item.id, "unprofitable") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemInCategory(
                                      item.id,
                                      "unprofitable"
                                    );
                                  }}
                                  className="mini-button mini-button--unprofitable"
                                >
                                  Нерент
                                </button>
                              )}
                            </>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowComments(item);
                            }}
                            className={`mini-button mini-button--comment ${
                              item.comments && item.comments.length > 0
                                ? "mini-button--comment-active"
                                : "mini-button--comment-inactive"
                            }`}
                          >
                            💬
                            {item.comments && item.comments.length > 0
                              ? item.comments.length
                              : "+"}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell table-cell--comment-date">
                      {item.categoryAddedDate
                        ? new Date(item.categoryAddedDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="table-cell table-cell--comment-date">
                      {item.lastCommentDate
                        ? new Date(item.lastCommentDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="table-cell table-cell--comment-text">
                      {item.lastCommentText || "—"}
                    </td>
                    <td className="table-cell table-cell--cost">
                      {(item.baseCost || 0).toFixed(2)}
                    </td>
                    <td
                      className="table-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="number"
                        value={item.commission || 0}
                        onChange={(e) =>
                          updateItemCommission(item.id, e.target.value)
                        }
                        className="commission-input"
                      />
                    </td>
                    <td className="table-cell table-cell--total">
                      {(item.totalCost || 0).toFixed(2)}
                    </td>
                    <td className="table-cell table-cell--crm-stock">
                      {item.crmStock !== null && item.crmStock !== undefined
                        ? item.crmStock
                        : "—"}
                    </td>
                    <td className="table-cell table-cell--crm-price">
                      {item.crmPrice
                        ? (typeof item.crmPrice === "object"
                            ? item.crmPrice.price
                            : item.crmPrice
                          ).toFixed(2)
                        : "—"}
                    </td>
                    <td className="table-cell table-cell--prom-price">
                      {item.promPrice ? item.promPrice.toFixed(2) : "—"}
                    </td>
                    <td className="table-cell table-cell--last-price">
                      {item.lastPrice ? item.lastPrice.toFixed(2) : "—"}
                    </td>
                    <td
                      className="table-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="price-inputs">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Цена"
                          value={newPriceInputs[item.id] || ""}
                          onChange={(e) =>
                            handlePriceInputChange(item.id, e.target.value)
                          }
                          className="price-input"
                        />
                        <button
                          onClick={() => confirmPriceChange(item.id)}
                          disabled={
                            !newPriceInputs[item.id] ||
                            isNaN(parseFloat(newPriceInputs[item.id]))
                          }
                          className={`price-confirm ${
                            !newPriceInputs[item.id] ||
                            isNaN(parseFloat(newPriceInputs[item.id]))
                              ? "price-confirm--disabled"
                              : "price-confirm--enabled"
                          }`}
                        >
                          ✓
                        </button>
                      </div>
                      {item.priceHistory && item.priceHistory.length > 0 && (
                        <div className="price-history">
                          <div className="price-history-current">
                            Последняя:{" "}
                            {(
                              item.priceHistory[item.priceHistory.length - 1]
                                .price || 0
                            ).toFixed(2)}{" "}
                            ₴
                          </div>
                          <div className="price-history-date">
                            {new Date(
                              item.priceHistory[
                                item.priceHistory.length - 1
                              ].date
                            ).toLocaleDateString()}
                          </div>
                          {item.priceHistory.length > 1 && (
                            <div
                              className="price-history-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPriceHistory(item);
                              }}
                            >
                              История: {item.priceHistory.length} изм.
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="table-cell table-cell--price-date">
                      {item.lastPriceChangeDate
                        ? new Date(
                            item.lastPriceChangeDate
                          ).toLocaleDateString()
                        : "—"}
                    </td>
                    <td
                      className="table-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="info-price-buttons">
                        <button
                          onClick={() => togglePriceExpansion(item.id)}
                          className="mini-button mini-button--actions"
                        >
                          {expandedPriceRows.has(item.id) ? "▲" : "▼"} Цены
                        </button>
                        <button
                          onClick={() => toggleInfoExpansion(item.id)}
                          className="mini-button mini-button--info"
                        >
                          {expandedInfoRows.has(item.id) ? "▲" : "▼"} Инфо
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isInfoExpanded && expandedTables.size > 0 && (
                    <>
                      {/* Заголовок обычных таблиц */}
                      <tr className="info-table-header-row">
                        <th className="table-header-cell">#</th>
                        <th className="table-header-cell">ID</th>
                        <th className="table-header-cell">Себест.</th>
                        <th className="table-header-cell">Остаток</th>
                        <th className="table-header-cell">
                          Запас
                          <br />
                          дн.
                        </th>
                        <th className="table-header-cell">
                          Продаж
                          <br />
                          /мес
                        </th>
                        <th className="table-header-cell">
                          Продаж
                          <br />
                          /2нед
                        </th>
                        <th className="table-header-cell table-header-cell--applications">
                          Заявки
                          <br />
                          /мес
                        </th>
                        <th className="table-header-cell table-header-cell--applications">
                          Заявки
                          <br />
                          /2нед
                        </th>
                        <th className="table-header-cell">
                          Комиссия
                          <br />
                          (%)
                        </th>
                        <th className="table-header-cell table-header-cell--total">
                          Тотал
                          <br />
                          себест.
                        </th>
                        <th className="table-header-cell table-header-cell--crm">
                          Остаток
                          <br />
                          CRM
                        </th>
                        <th className="table-header-cell table-header-cell--price">
                          Цена
                          <br />
                          CRM
                        </th>
                        <th className="table-header-cell table-header-cell--prom">
                          Цена
                          <br />
                          PROM
                        </th>
                        <th className="table-header-cell">
                          Новая
                          <br />
                          цена
                        </th>
                      </tr>

                      {/* Строки из других таблиц */}
                      {(() => {
                        const otherTablesData = getItemDataFromOtherTables(
                          item.id,
                          null
                        );
                        return Array.from(expandedTables).map((tableId) => {
                          const tableInfo = otherTablesData.find(
                            (t) => t.tableId === tableId
                          );
                          if (!tableInfo || !tableInfo.data) {
                            return (
                              <tr
                                key={`${item.id}-${tableId}-no-data`}
                                className="info-no-data-row"
                              >
                                <td
                                  colSpan="11"
                                  className="table-cell table-cell--no-data"
                                >
                                  <span className="info-no-data-message">
                                    ID "{item.id}" не найден в таблице "
                                    {tableInfo?.tableName || "Unknown"}"
                                  </span>
                                </td>
                              </tr>
                            );
                          }

                          const otherRowColors = getRowColors(tableInfo.data);
                          const getOtherRowClassName = () => {
                            let className = "table-row info-row-from-table";
                            if (otherRowColors.backgroundColor === "#4a2c4a")
                              className += " table-row--price-and-comment";
                            else if (
                              otherRowColors.backgroundColor === "#2c4a2c"
                            )
                              className += " table-row--price-only";
                            else if (
                              otherRowColors.backgroundColor === "#1a2f3a"
                            )
                              className += " table-row--comment-only";
                            else if (
                              otherRowColors.backgroundColor === "#4a2c2c"
                            )
                              className += " table-row--crm-zero";
                            else if (
                              otherRowColors.backgroundColor === "#4a3d2c"
                            )
                              className += " table-row--crm-low";
                            else className += " table-row--transparent";
                            return className;
                          };

                          return (
                            <tr
                              key={`${item.id}-${tableId}-info`}
                              className={getOtherRowClassName()}
                            >
                              <td className="table-cell table-cell--center">
                                <span className="other-table-row-indicator">
                                  —
                                </span>
                              </td>
                              <td className="table-cell">
                                <div>
                                  <div className="cell-content">
                                    <span
                                      className={`item-id ${
                                        tableInfo.data.priceHistory &&
                                        tableInfo.data.priceHistory.length >
                                          0 &&
                                        tableInfo.data.comments &&
                                        tableInfo.data.comments.length > 0
                                          ? "item-id--price-and-comment"
                                          : tableInfo.data.priceHistory &&
                                            tableInfo.data.priceHistory.length >
                                              0
                                          ? "item-id--price-only"
                                          : tableInfo.data.comments &&
                                            tableInfo.data.comments.length > 0
                                          ? "item-id--comment-only"
                                          : "item-id--default"
                                      }`}
                                    >
                                      {tableInfo.data.id}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="table-cell table-cell--cost">
                                {(tableInfo.data.baseCost || 0).toFixed(2)}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.stock || 0}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.daysStock || 0}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.salesMonth || 0}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.sales2Weeks || 0}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.applicationsMonth !== null
                                  ? tableInfo.data.applicationsMonth || 0
                                  : "—"}
                              </td>
                              <td className="table-cell">
                                {tableInfo.data.applications2Weeks !== null
                                  ? tableInfo.data.applications2Weeks || 0
                                  : "—"}
                              </td>
                              <td className="table-cell">
                                <span className="commission-readonly">
                                  {tableInfo.data.commission || 0}
                                </span>
                              </td>
                              <td className="table-cell table-cell--total">
                                {(tableInfo.data.totalCost || 0).toFixed(2)}
                              </td>
                              <td className="table-cell table-cell--crm-stock">
                                {tableInfo.data.crmStock !== null &&
                                tableInfo.data.crmStock !== undefined
                                  ? tableInfo.data.crmStock
                                  : "—"}
                              </td>
                              <td className="table-cell table-cell--crm-price">
                                {tableInfo.data.crmPrice
                                  ? (typeof tableInfo.data.crmPrice === "object"
                                      ? tableInfo.data.crmPrice.price
                                      : tableInfo.data.crmPrice
                                    ).toFixed(2)
                                  : "—"}
                              </td>
                              <td className="table-cell table-cell--prom-price">
                                {tableInfo.data.promPrice
                                  ? tableInfo.data.promPrice.toFixed(2)
                                  : "—"}
                              </td>
                              <td
                                className="table-cell table-cell--center table-cell--other-table-name"
                                colSpan="1"
                              >
                                <div className="other-table-full-name">
                                  <span className="other-table-name-text">
                                    {tableInfo.tableName}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </>
                  )}
                  {expandedPriceRows.has(item.id) && (
                    <tr className="price-expansion">
                      <td colSpan="15" className="price-expansion-cell">
                        <div className="price-grid">
                          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(
                            (percent) => (
                              <div
                                key={percent}
                                className="price-item"
                                style={{
                                  borderColor: getGradientColor(percent),
                                }}
                              >
                                <div
                                  className="price-percent"
                                  style={{ color: getGradientColor(percent) }}
                                >
                                  +{percent}%
                                </div>
                                <div className="price-value">
                                  {(item[`markup${percent}`] || 0).toFixed(2)} ₴
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {isInfoExpanded && (
                    <tr className="info-tables-selector">
                      <td colSpan="15" className="info-tables-selector-cell">
                        <div className="info-tables-header">
                          <h4 className="info-tables-title">
                            Выберите таблицы для сравнения с ID "{item.id}":
                          </h4>
                        </div>
                        <div className="info-tables-buttons">
                          {(() => {
                            const otherTablesData = getItemDataFromOtherTables(
                              item.id,
                              null
                            );
                            if (otherTablesData.length === 0) {
                              return (
                                <div className="info-empty">Таблиц нет</div>
                              );
                            }

                            return otherTablesData.map((tableInfo) => {
                              const isTableExpanded =
                                expandedInfoTables[item.id] &&
                                expandedInfoTables[item.id].has(
                                  tableInfo.tableId
                                );
                              return (
                                <button
                                  key={tableInfo.tableId}
                                  onClick={() =>
                                    toggleInfoTable(item.id, tableInfo.tableId)
                                  }
                                  className={`info-table-button ${
                                    isTableExpanded
                                      ? "info-table-button--active"
                                      : "info-table-button--inactive"
                                  } ${
                                    !tableInfo.data
                                      ? "info-table-button--no-data"
                                      : ""
                                  }`}
                                >
                                  <span className="info-table-button-name">
                                    {tableInfo.tableName}
                                  </span>
                                  <span className="info-table-button-date">
                                    {new Date(
                                      tableInfo.uploadTime
                                    ).toLocaleDateString()}
                                  </span>
                                  {!tableInfo.data && (
                                    <span className="info-table-button-no-data">
                                      ID не найден
                                    </span>
                                  )}
                                  <span className="info-table-button-toggle">
                                    {isTableExpanded ? "✓" : "+"}
                                  </span>
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Функция для рендера обычной таблицы
  const renderTable = (
    dataToRender,
    startIdx,
    isGlobalView = false,
    showTableNames = false
  ) => {
    return (
      <div
        ref={tableContainerRef}
        className="table-container"
        data-table-container="true"
      >
        <table className="main-table">
          <thead className="table-header">
            <tr className="table-header-row">
              <th className="table-header-cell">#</th>
              {[
                { key: "id", label: "ID" },
                { key: "baseCost", label: "Себест." },
                { key: "stock", label: "Остаток" },
                { key: "daysStock", label: "Запас\nдн." },
                { key: "salesMonth", label: "Продаж\n/мес" },
                { key: "sales2Weeks", label: "Продаж\n/2нед" },
                {
                  key: "applicationsMonth",
                  label: "Заявки\n/мес",
                  color: "applications",
                },
                {
                  key: "applications2Weeks",
                  label: "Заявки\n/2нед",
                  color: "applications",
                },
                { key: "commission", label: "Комиссия\n(%)" },
                { key: "totalCost", label: "Тотал\nсебест.", color: "total" },
                { key: "crmStock", label: "Остаток\nCRM", color: "crm" },
                { key: "crmPrice", label: "Цена\nCRM", color: "price" },
                { key: "promPrice", label: "Цена\nPROM", color: "prom" },
                { key: null, label: "Новая\nцена" },
              ].map((col) => (
                <th
                  key={col.key || col.label}
                  className={`table-header-cell table-header-cell--${
                    col.color || "default"
                  }`}
                  onClick={
                    col.key
                      ? isGlobalView
                        ? () => handleGlobalSort(col.key)
                        : () => handleSort(col.key)
                      : undefined
                  }
                >
                  {col.label}{" "}
                  {col.key &&
                    (isGlobalView
                      ? globalViewFilters.sortConfig
                      : currentFilters.sortConfig
                    ).key === col.key &&
                    ((isGlobalView
                      ? globalViewFilters.sortConfig
                      : currentFilters.sortConfig
                    ).direction === "asc"
                      ? "↑"
                      : (isGlobalView
                          ? globalViewFilters.sortConfig
                          : currentFilters.sortConfig
                        ).direction === "desc"
                      ? "↓"
                      : "")}
                </th>
              ))}
              <th className="table-header-cell table-header-cell--actions">
                Градация
              </th>
            </tr>
          </thead>
          <tbody>
            {dataToRender.map((item, index) => {
              const mainRowKey = `${item.id}-${startIdx + index}`;
              const isInfoExpanded = expandedInfoRows.has(item.id);
              const expandedTables = expandedInfoTables[item.id] || new Set();

              return (
                <React.Fragment key={mainRowKey}>
                  <TableRow
                    item={item}
                    index={index}
                    globalIndex={startIdx + index}
                    newPriceInputs={newPriceInputs}
                    onPriceInputChange={handlePriceInputChange}
                    onConfirmPriceChange={confirmPriceChange}
                    onCopyToClipboard={copyToClipboard}
                    onShowComments={setShowComments}
                    onShowPriceHistory={setShowPriceHistory}
                    onUpdateCommission={updateItemCommission}
                    onToggleCategory={toggleItemInCategory}
                    onIsInCategory={isInCategory}
                    getRowColors={getRowColors}
                    getGradientColor={getGradientColor}
                    showTableName={showTableNames}
                    tableName={item.primaryTableName || item.tableName || ""}
                    isGlobalView={isGlobalView}
                    isSelected={selectedItemId === item.id}
                    onRowClick={handleRowClick}
                    isExpanded={expandedPriceRows.has(item.id)}
                    onTogglePriceExpansion={togglePriceExpansion}
                    isInfoExpanded={isInfoExpanded}
                    onToggleInfoExpansion={toggleInfoExpansion}
                    expandedInfoTables={expandedInfoTables}
                    onToggleInfoTable={toggleInfoTable}
                    getItemDataFromOtherTables={getItemDataFromOtherTables}
                    currentTableId={activeTableId}
                    isCategoriesExpanded={expandedCategoriesRows.has(item.id)}
                    onToggleCategoriesExpansion={toggleCategoriesExpansion}
                  />

                  {/* СНАЧАЛА строки из других таблиц - сразу под основной строкой */}
                  {isInfoExpanded &&
                    expandedTables.size > 0 &&
                    (() => {
                      const otherTablesData = getItemDataFromOtherTables(
                        item.id,
                        activeTableId
                      );
                      return Array.from(expandedTables).map((tableId) => {
                        const tableInfo = otherTablesData.find(
                          (t) => t.tableId === tableId
                        );
                        if (!tableInfo || !tableInfo.data) return null;

                        const otherRowColors = getRowColors(tableInfo.data);
                        const getOtherRowClassName = () => {
                          let className = "table-row info-row-from-table";
                          if (otherRowColors.backgroundColor === "#4a2c4a")
                            className += " table-row--price-and-comment";
                          else if (otherRowColors.backgroundColor === "#2c4a2c")
                            className += " table-row--price-only";
                          else if (otherRowColors.backgroundColor === "#1a2f3a")
                            className += " table-row--comment-only";
                          else if (otherRowColors.backgroundColor === "#4a2c2c")
                            className += " table-row--crm-zero";
                          else if (otherRowColors.backgroundColor === "#4a3d2c")
                            className += " table-row--crm-low";
                          else className += " table-row--transparent";
                          return className;
                        };

                        return (
                          <tr
                            key={`${item.id}-${tableId}-info`}
                            className={getOtherRowClassName()}
                          >
                            <td className="table-cell table-cell--center">
                              <span className="other-table-row-indicator">
                                —
                              </span>
                            </td>
                            <td className="table-cell">
                              <div>
                                <div className="cell-content">
                                  <span
                                    className={`item-id ${
                                      tableInfo.data.priceHistory &&
                                      tableInfo.data.priceHistory.length > 0 &&
                                      tableInfo.data.comments &&
                                      tableInfo.data.comments.length > 0
                                        ? "item-id--price-and-comment"
                                        : tableInfo.data.priceHistory &&
                                          tableInfo.data.priceHistory.length > 0
                                        ? "item-id--price-only"
                                        : tableInfo.data.comments &&
                                          tableInfo.data.comments.length > 0
                                        ? "item-id--comment-only"
                                        : "item-id--default"
                                    }`}
                                  >
                                    {tableInfo.data.id}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="table-cell table-cell--cost">
                              {(tableInfo.data.baseCost || 0).toFixed(2)}
                            </td>
                            <td className="table-cell">
                              {tableInfo.data.stock || 0}
                            </td>
                            <td className="table-cell">
                              {tableInfo.data.daysStock || 0}
                            </td>
                            <td className="table-cell">
                              {tableInfo.data.salesMonth || 0}
                            </td>
                            <td className="table-cell">
                              {tableInfo.data.sales2Weeks || 0}
                            </td>
                            <td className="table-cell">
                              {tableInfo.data.applicationsMonth !== null
                                ? tableInfo.data.applicationsMonth || 0
                                : "—"}
                            </td>
                            <td className="table-cell">
                              {tableInfo.data.applications2Weeks !== null
                                ? tableInfo.data.applications2Weeks || 0
                                : "—"}
                            </td>
                            <td className="table-cell">
                              <span className="commission-readonly">
                                {tableInfo.data.commission || 0}
                              </span>
                            </td>
                            <td className="table-cell table-cell--total">
                              {(tableInfo.data.totalCost || 0).toFixed(2)}
                            </td>
                            <td className="table-cell table-cell--crm-stock">
                              {tableInfo.data.crmStock !== null &&
                              tableInfo.data.crmStock !== undefined
                                ? tableInfo.data.crmStock
                                : "—"}
                            </td>
                            <td className="table-cell table-cell--crm-price">
                              {tableInfo.data.crmPrice
                                ? (typeof tableInfo.data.crmPrice === "object"
                                    ? tableInfo.data.crmPrice.price
                                    : tableInfo.data.crmPrice
                                  ).toFixed(2)
                                : "—"}
                            </td>
                            <td className="table-cell table-cell--prom-price">
                              {tableInfo.data.promPrice
                                ? tableInfo.data.promPrice.toFixed(2)
                                : "—"}
                            </td>
                            <td
                              className="table-cell table-cell--center table-cell--other-table-name"
                              colSpan="2"
                            >
                              <div className="other-table-full-name">
                                <span className="other-table-name-text">
                                  {tableInfo.tableName}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}

                  {/* ПОТОМ кнопки выбора таблиц - в самом конце */}
                  {isInfoExpanded && (
                    <tr className="info-tables-selector">
                      <td colSpan="16" className="info-tables-selector-cell">
                        <div className="info-tables-header">
                          <h4 className="info-tables-title">
                            Выберите таблицы для сравнения с ID "{item.id}":
                          </h4>
                        </div>
                        <div className="info-tables-buttons">
                          {(() => {
                            const otherTablesData = getItemDataFromOtherTables(
                              item.id,
                              activeTableId
                            );
                            if (otherTablesData.length === 0) {
                              return (
                                <div className="info-empty">
                                  Других таблиц нет
                                </div>
                              );
                            }

                            return otherTablesData.map((tableInfo) => {
                              const isTableExpanded =
                                expandedInfoTables[item.id] &&
                                expandedInfoTables[item.id].has(
                                  tableInfo.tableId
                                );
                              return (
                                <button
                                  key={tableInfo.tableId}
                                  onClick={() =>
                                    toggleInfoTable(item.id, tableInfo.tableId)
                                  }
                                  className={`info-table-button ${
                                    isTableExpanded
                                      ? "info-table-button--active"
                                      : "info-table-button--inactive"
                                  } ${
                                    !tableInfo.data
                                      ? "info-table-button--no-data"
                                      : ""
                                  }`}
                                >
                                  <span className="info-table-button-name">
                                    {tableInfo.tableName}
                                  </span>
                                  <span className="info-table-button-date">
                                    {new Date(
                                      tableInfo.uploadTime
                                    ).toLocaleDateString()}
                                  </span>
                                  {!tableInfo.data && (
                                    <span className="info-table-button-no-data">
                                      ID не найден
                                    </span>
                                  )}
                                  <span className="info-table-button-toggle">
                                    {isTableExpanded ? "✓" : "+"}
                                  </span>
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Функция рендера пагинации
  const renderPagination = (
    currentPage,
    totalPages,
    onPageChange,
    isPrimary = false
  ) => {
    return (
      <div className="pagination">
        <div className="pagination-info">
          Страница {currentPage} из {totalPages}
          {isPrimary && <span> (основная)</span>}
        </div>
        <div className="pagination-buttons">
          {[
            {
              label: "««",
              action: () => onPageChange(1),
              disabled: currentPage === 1,
            },
            {
              label: "«",
              action: () => onPageChange(Math.max(1, currentPage - 1)),
              disabled: currentPage === 1,
            },
            {
              label: currentPage.toString(),
              action: null,
              disabled: false,
              active: true,
            },
            {
              label: "»",
              action: () => onPageChange(Math.min(totalPages, currentPage + 1)),
              disabled: currentPage === totalPages,
            },
            {
              label: "»»",
              action: () => onPageChange(totalPages),
              disabled: currentPage === totalPages,
            },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              disabled={btn.disabled}
              className={`pagination-button ${
                btn.active
                  ? "pagination-button--active"
                  : btn.disabled
                  ? "pagination-button--disabled"
                  : "pagination-button--inactive"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <div className="main-wrapper">
        {/* Навигация */}
        <div className="navigation">
          <button
            onClick={() => setCurrentSection("home")}
            className={`nav-button ${
              currentSection === "home"
                ? "nav-button--active"
                : "nav-button--inactive"
            }`}
          >
            <span className="icon icon--home"></span> Главная
          </button>
          <button
            onClick={() => setCurrentSection("upload")}
            className={`nav-button ${
              currentSection === "upload"
                ? "nav-button--active"
                : "nav-button--inactive"
            }`}
          >
            <span className="icon icon--upload"></span> Загрузить
          </button>
          {activeTable && (
            <button
              onClick={() => setCurrentSection("table")}
              className={`nav-button ${
                currentSection === "table"
                  ? "nav-button--active"
                  : "nav-button--inactive"
              }`}
            >
              <span className="icon icon--table"></span> Таблицы
            </button>
          )}
          <button
            onClick={() => setCurrentSection("price_changed_global")}
            className={`nav-button nav-button--price-changed ${
              currentSection === "price_changed_global"
                ? "nav-button--active"
                : "nav-button--inactive"
            }`}
          >
            <span className="icon icon--chart"></span> Измененные цены (
            {globalAnalytics.uniquePriceChangedItems})
          </button>
          <button
            onClick={() => setCurrentSection("commented_global")}
            className={`nav-button nav-button--commented ${
              currentSection === "commented_global"
                ? "nav-button--active"
                : "nav-button--inactive"
            }`}
          >
            <span className="icon icon--comment"></span> Комментарии (
            {globalAnalytics.uniqueCommentedItems})
          </button>
          <button
            onClick={() => setCurrentSection("new_global")}
            className={`nav-button nav-button--new ${
              currentSection === "new_global"
                ? "nav-button--active"
                : "nav-button--inactive"
            }`}
          >
            <span className="icon icon--star"></span> Новый (
            {globalCategories.new.size})
          </button>
          <button
            onClick={() => setCurrentSection("optimization_global")}
            className={`nav-button nav-button--optimization ${
              currentSection === "optimization_global"
                ? "nav-button--active"
                : "nav-button--inactive"
            }`}
          >
            <span className="icon icon--settings"></span> Оптимизация (
            {globalCategories.optimization.size})
          </button>
          <button
            onClick={() => setCurrentSection("ab_global")}
            className={`nav-button nav-button--ab ${
              currentSection === "ab_global"
                ? "nav-button--active"
                : "nav-button--inactive"
            }`}
          >
            <span className="icon icon--expand"></span> A/B (
            {globalCategories.ab.size})
          </button>
          <button
            onClick={() => setCurrentSection("c_sale_global")}
            className={`nav-button nav-button--c-sale ${
              currentSection === "c_sale_global"
                ? "nav-button--active"
                : "nav-button--inactive"
            }`}
          >
            <span className="icon icon--chart"></span> С-Продажа (
            {globalCategories.c_sale.size})
          </button>
          <button
            onClick={() => setCurrentSection("off_season_global")}
            className={`nav-button nav-button--off-season ${
              currentSection === "off_season_global"
                ? "nav-button--active"
                : "nav-button--inactive"
            }`}
          >
            <span className="icon icon--collapse"></span> Несезон (
            {globalCategories.off_season.size})
          </button>
          <button
            onClick={() => setCurrentSection("unprofitable_global")}
            className={`nav-button nav-button--unprofitable ${
              currentSection === "unprofitable_global"
                ? "nav-button--active"
                : "nav-button--inactive"
            }`}
          >
            <span className="icon icon--close"></span> Нерентабельные (
            {globalCategories.unprofitable.size})
          </button>
        </div>

        {/* Индикатор загрузки */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-modal">
              <div className="loading-icon">⏳</div>
              <div>Обработка файла...</div>
            </div>
          </div>
        )}

        {/* Уведомления */}
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            className={`notification notification--${notification.type}`}
            style={{ top: `${88 + index * 56}px` }}
            onClick={() => removeNotification(notification.id)}
          >
            {notification.message}
          </div>
        ))}

        {/* Контент */}
        {currentSection === "home" && (
          <div className="home-container">
            <div className="home-hero">
              <div className="stats-grid">
                {[
                  {
                    value: globalAnalytics.totalTables,
                    label: "Таблиц",
                    color: "#667eea",
                  },
                  {
                    value: globalAnalytics.totalItems,
                    label: "Уникальных товаров",
                    color: "#28a745",
                  },
                  {
                    value: Object.keys(globalCommissions).length,
                    label: "Сохранённых комиссий",
                    color: "#ffc107",
                  },
                  {
                    value: globalAnalytics.totalPriceChanges,
                    label: "Изм. цен",
                    color: "#17a2b8",
                  },
                  {
                    value: globalAnalytics.totalComments,
                    label: "Комментариев",
                    color: "#9b59b6",
                  },
                ].map((stat, i) => (
                  <div key={i} className="stat-item">
                    <div className="stat-value" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {tables.length > 0 && (
              <div className="tables-section">
                <h3 className="section-title">
                  <span className="icon icon--table"></span>
                  Таблицы ({tables.length})
                </h3>
                <div className="tables-grid">
                  {tables
                    .sort(
                      (a, b) => new Date(b.uploadTime) - new Date(a.uploadTime)
                    )
                    .map((table) => {
                      const tableStats = globalAnalytics.tableStats.find(
                        (stat) => stat.id === table.id
                      );
                      const hasCrmData = table.data.some(
                        (item) => item.crmPrice !== null
                      );
                      const hasPromData = table.data.some(
                        (item) => item.promPrice !== null
                      );

                      return (
                        <div
                          key={table.id}
                          className={`table-card ${
                            activeTableId === table.id
                              ? "table-card--active"
                              : "table-card--inactive"
                          }`}
                        >
                          <div className="table-card-header">
                            <div>
                              <div
                                className={`table-card-title ${
                                  activeTableId === table.id
                                    ? "table-card-title--active"
                                    : ""
                                }`}
                              >
                                {table.name}
                                {activeTableId === table.id && (
                                  <span className="table-card-active-badge">
                                    (активная)
                                  </span>
                                )}
                              </div>
                              <div className="table-card-date">
                                📅 {formatDateTime(table.uploadTime)}
                              </div>
                              <div className="table-card-stats">
                                <span className="table-card-stat--items">
                                  📦 {tableStats?.itemsCount || 0}
                                </span>
                                <span className="table-card-stat--changes">
                                  📈 {tableStats?.priceChanges || 0}
                                </span>
                                <span className="table-card-stat--comments">
                                  💬 {tableStats?.comments || 0}
                                </span>
                              </div>
                              <div className="table-card-badges">
                                <span
                                  className={`table-card-badge ${
                                    hasCrmData
                                      ? "table-card-badge--crm-loaded"
                                      : "table-card-badge--crm-empty"
                                  }`}
                                >
                                  {hasCrmData ? "✓ CRM" : "○ CRM"}
                                </span>
                                <span
                                  className={`table-card-badge ${
                                    hasPromData
                                      ? "table-card-badge--prom-loaded"
                                      : "table-card-badge--prom-empty"
                                  }`}
                                >
                                  {hasPromData ? "✓ PROM" : "○ PROM"}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => closeTable(table.id, e)}
                              disabled={isDeletingTable === table.id}
                              className={`table-card-close ${
                                isDeletingTable === table.id
                                  ? "table-card-close--deleting"
                                  : ""
                              }`}
                            >
                              {isDeletingTable === table.id ? (
                                <span className="icon icon--loading">⏳</span>
                              ) : (
                                <span className="icon icon--close"></span>
                              )}
                            </button>
                          </div>
                          <div className="table-card-actions">
                            <button
                              onClick={() => {
                                setActiveTableId(table.id);
                                setCurrentSection("table");
                              }}
                              className="table-card-open"
                            >
                              Открыть
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="quick-actions">
              <button
                onClick={() => setCurrentSection("upload")}
                className="quick-action quick-action--upload"
              >
                <div className="quick-action-icon">📤</div>
                <div className="quick-action-title">Загрузить таблицу</div>
              </button>
              {activeTable && (
                <button
                  onClick={() => setCurrentSection("table")}
                  className="quick-action quick-action--current"
                >
                  <div className="quick-action-icon">📋</div>
                  <div className="quick-action-title">Текущая таблица</div>
                </button>
              )}
              <button
                onClick={() => setCurrentSection("price_changed_global")}
                className="quick-action quick-action--prices"
              >
                <div className="quick-action-icon">📈</div>
                <div className="quick-action-title">Измененные цены</div>
                <div className="quick-action-subtitle">
                  ({globalAnalytics.uniquePriceChangedItems} позиций)
                </div>
              </button>
              <button
                onClick={() => setCurrentSection("commented_global")}
                className="quick-action quick-action--comments"
              >
                <div className="quick-action-icon">💬</div>
                <div className="quick-action-title">Комментарии</div>
                <div className="quick-action-subtitle">
                  ({globalAnalytics.uniqueCommentedItems} позиций)
                </div>
              </button>
            </div>
          </div>
        )}

        {currentSection === "upload" && (
          <div className="upload-container">
            <h2>📤 Загрузить таблицу</h2>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`drop-zone ${
                isDragOver
                  ? "drop-zone--drag-over"
                  : isLoading
                  ? "drop-zone--loading"
                  : ""
              }`}
            >
              <div className="drop-zone-icon">{isLoading ? "⏳" : "📊"}</div>
              <h3
                className={`drop-zone-title ${
                  isLoading ? "drop-zone-title--loading" : ""
                }`}
              >
                {isLoading
                  ? "Обрабатываем файл..."
                  : "Перетащите Excel файл сюда"}
              </h3>
              <p className="drop-zone-subtitle">
                {isLoading
                  ? "Пожалуйста, подождите"
                  : "или нажмите для выбора файла (.xlsx, .xls)"}
              </p>

              {!isLoading && (
                <>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileInput}
                    style={{ display: "none" }}
                    id="file-upload-input"
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="file-upload-input"
                    className="file-label"
                    style={{ cursor: "pointer" }}
                  >
                    Выбрать файл
                  </label>
                </>
              )}
            </div>

            {Object.keys(globalCommissions).length > 0 && (
              <div className="saved-commissions">
                <h3 className="saved-commissions-title">
                  💼 Сохранённые комиссии (
                  {Object.keys(globalCommissions).length})
                </h3>
                <div className="commissions-grid">
                  {Object.entries(globalCommissions).map(
                    ([itemId, commission]) => (
                      <div key={itemId} className="commission-item">
                        <span className="commission-id">ID: {itemId}</span>
                        <span className="commission-value">{commission}%</span>
                      </div>
                    )
                  )}
                </div>
                <div className="commissions-note">
                  ✓ Эти комиссии автоматически сохраняются на сервере и
                  применяются для новых таблиц
                </div>
              </div>
            )}
          </div>
        )}

        {/* Глобальное представление "Измененные цены" */}
        {currentSection === "price_changed_global" && (
          <>
            {renderGlobalFilters("price_changed")}

            {/* Поиск и контролы перемещены под фильтры */}
            <div className="search-controls">
              <div className="search-controls-grid">
                <div className="search-inputs-group">
                  <div className="search-input-wrapper">
                    <label className="search-label">Поиск ID:</label>
                    <input
                      type="text"
                      value={globalViewFilters.searchId}
                      onChange={(e) =>
                        updateGlobalFiltersWithScroll({
                          searchId: e.target.value,
                          currentPage: 1,
                        })
                      }
                      placeholder="ID..."
                      className="search-input"
                    />
                  </div>
                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.showOnlyProm || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          showOnlyProm: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--prom">
                      Только PROM
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockZero || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockZero: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-zero">
                      Скрыть остаток CRM = 0
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockLowSix || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockLowSix: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-low">
                      Скрыть остаток CRM &lt; 6
                    </span>
                  </label>
                </div>
                <div className="search-actions">
                  <div className="search-counter">
                    Найдено: {globalSortedData.length}
                  </div>
                  <select
                    value={globalViewFilters.itemsPerPage}
                    onChange={(e) => {
                      setGlobalViewFilters((prev) => ({
                        ...prev,
                        itemsPerPage: Number(e.target.value),
                        currentPage: 1,
                      }));
                      resetTableScrollOnly();
                    }}
                    className="search-select"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                  <div className="xml-update-compact">
                    <button
                      onClick={updatePriceChangedXmlData}
                      disabled={
                        globalXmlLoadingStatus.crm === "loading" ||
                        globalXmlLoadingStatus.prom === "loading"
                      }
                      className={`xml-update-button ${
                        globalXmlLoadingStatus.crm === "loading" ||
                        globalXmlLoadingStatus.prom === "loading"
                          ? "xml-update-button--loading"
                          : ""
                      }`}
                    >
                      {globalXmlLoadingStatus.crm === "loading" ||
                      globalXmlLoadingStatus.prom === "loading"
                        ? "⏳ Обновление..."
                        : "🔄 Обновить XML"}
                    </button>
                    <div className="xml-update-date">
                      {xmlLastUpdate.global_price_changed
                        ? formatDateTime(xmlLastUpdate.global_price_changed)
                        : "Не обновлялось"}
                    </div>
                  </div>
                  <button
                    onClick={clearAllGlobalFilters}
                    className="clear-filters"
                  >
                    Сбросить все
                  </button>
                </div>
              </div>
            </div>

            {/* Пагинация */}
            {globalTotalPages > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                globalTotalPages,
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true),
                true
              )}

            {globalPaginatedData.length > 0 ? (
              renderGlobalTable(globalPaginatedData, globalStartIndex, true)
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📈</div>
                <div className="empty-state-message">
                  Нет товаров с изменениями цен
                </div>
                {hasActiveGlobalFilters() && (
                  <div className="empty-state-suggestion">
                    Попробуйте изменить фильтры или очистить их
                  </div>
                )}
              </div>
            )}

            {/* Дублированная пагинация внизу */}
            {globalTotalPages > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                globalTotalPages,
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true)
              )}

            <div className="table-footer">
              Показано: {globalPaginatedData.length} из{" "}
              {globalSortedData.length} уникальных товаров с изменениями цен
              {Object.keys(globalCrmData).length > 0 && (
                <span className="footer-section">
                  {" "}
                  | 🌐 CRM: {Object.keys(globalCrmData).length} поз. (
                  {formatDateTime(xmlLastUpdate.global_crm)})
                </span>
              )}
              {Object.keys(globalPromData).length > 0 && (
                <span className="footer-section footer-section--prom">
                  {" "}
                  | 🌐 PROM: {Object.keys(globalPromData).length} поз. (
                  {formatDateTime(xmlLastUpdate.global_prom)})
                </span>
              )}
              {hasActiveGlobalFilters() && (
                <span className="footer-section footer-section--warning">
                  {" "}
                  | Фильтры: {getGlobalFilterStats().join(", ")}
                </span>
              )}
            </div>
          </>
        )}

        {/* Глобальное представление "Комментарии" */}
        {currentSection === "commented_global" && (
          <>
            {renderGlobalFilters("commented")}

            {/* Поиск и контролы перемещены под фильтры */}
            <div className="search-controls">
              <div className="search-controls-grid">
                <div className="search-inputs-group">
                  <div className="search-input-wrapper">
                    <label className="search-label">Поиск ID:</label>
                    <input
                      type="text"
                      value={globalViewFilters.searchId}
                      onChange={(e) =>
                        updateGlobalFiltersWithScroll({
                          searchId: e.target.value,
                          currentPage: 1,
                        })
                      }
                      placeholder="ID..."
                      className="search-input"
                    />
                  </div>
                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.showOnlyProm || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          showOnlyProm: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--prom">
                      Только PROM
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockZero || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockZero: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-zero">
                      Скрыть остаток CRM = 0
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockLowSix || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockLowSix: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-low">
                      Скрыть остаток CRM &lt; 6
                    </span>
                  </label>
                </div>
                <div className="search-actions">
                  <div className="search-counter">
                    Найдено: {globalSortedData.length}
                  </div>
                  <select
                    value={globalViewFilters.itemsPerPage}
                    onChange={(e) => {
                      setGlobalViewFilters((prev) => ({
                        ...prev,
                        itemsPerPage: Number(e.target.value),
                        currentPage: 1,
                      }));
                      resetTableScrollOnly();
                    }}
                    className="search-select"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                  <div className="xml-update-compact">
                    <button
                      onClick={updateCommentedXmlData}
                      disabled={
                        globalXmlLoadingStatus.crm === "loading" ||
                        globalXmlLoadingStatus.prom === "loading"
                      }
                      className={`xml-update-button ${
                        globalXmlLoadingStatus.crm === "loading" ||
                        globalXmlLoadingStatus.prom === "loading"
                          ? "xml-update-button--loading"
                          : ""
                      }`}
                    >
                      {globalXmlLoadingStatus.crm === "loading" ||
                      globalXmlLoadingStatus.prom === "loading"
                        ? "⏳ Обновление..."
                        : "🔄 Обновить XML"}
                    </button>
                    <div className="xml-update-date">
                      {xmlLastUpdate.global_commented
                        ? formatDateTime(xmlLastUpdate.global_commented)
                        : "Не обновлялось"}
                    </div>
                  </div>
                  <button
                    onClick={clearAllGlobalFilters}
                    className="clear-filters"
                  >
                    Сбросить все
                  </button>
                </div>
              </div>
            </div>

            {/* Пагинация */}
            {globalTotalPages > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                globalTotalPages,
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true)
              )}

            {globalPaginatedData.length > 0 ? (
              renderGlobalTable(globalPaginatedData, globalStartIndex, true)
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <div className="empty-state-message">
                  Нет товаров с комментариями
                </div>
                {hasActiveGlobalFilters() && (
                  <div className="empty-state-suggestion">
                    Попробуйте изменить фильтры или очистить их
                  </div>
                )}
              </div>
            )}

            {/* Дублированная пагинация внизу */}
            {globalTotalPages > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                globalTotalPages,
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true)
              )}

            <div className="table-footer">
              Показано: {globalPaginatedData.length} из{" "}
              {globalSortedData.length} уникальных товаров с комментариями
              {Object.keys(globalCrmData).length > 0 && (
                <span className="footer-section">
                  {" "}
                  | 🌐 CRM: {Object.keys(globalCrmData).length} поз. (
                  {formatDateTime(xmlLastUpdate.global_crm)})
                </span>
              )}
              {Object.keys(globalPromData).length > 0 && (
                <span className="footer-section footer-section--prom">
                  {" "}
                  | 🌐 PROM: {Object.keys(globalPromData).length} поз. (
                  {formatDateTime(xmlLastUpdate.global_prom)})
                </span>
              )}
              {hasActiveGlobalFilters() && (
                <span className="footer-section footer-section--warning">
                  {" "}
                  | Фильтры: {getGlobalFilterStats().join(", ")}
                </span>
              )}
            </div>
          </>
        )}

        {/* Секция "Новый" */}
        {currentSection === "new_global" && (
          <>
            {renderGlobalFilters("new")}

            <div className="search-controls">
              <div className="search-controls-grid">
                <div className="search-inputs-group">
                  <div className="search-input-wrapper">
                    <label className="search-label">Поиск ID:</label>
                    <input
                      type="text"
                      value={globalViewFilters.searchId}
                      onChange={(e) =>
                        updateGlobalFiltersWithScroll({
                          searchId: e.target.value,
                          currentPage: 1,
                        })
                      }
                      placeholder="ID..."
                      className="search-input"
                    />
                  </div>
                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.showOnlyProm || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          showOnlyProm: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--prom">
                      Только PROM
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockZero || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockZero: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-zero">
                      Скрыть остаток CRM = 0
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockLowSix || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockLowSix: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-low">
                      Скрыть остаток CRM &lt; 6
                    </span>
                  </label>
                </div>
                <div className="search-actions">
                  <div className="search-counter">
                    Найдено: {getCategorySortedData("new").length}
                  </div>
                  <select
                    value={globalViewFilters.itemsPerPage}
                    onChange={(e) => {
                      setGlobalViewFilters((prev) => ({
                        ...prev,
                        itemsPerPage: Number(e.target.value),
                        currentPage: 1,
                      }));
                      resetTableScrollOnly();
                    }}
                    className="search-select"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                  <button
                    onClick={clearAllGlobalFilters}
                    className="clear-filters"
                  >
                    Сбросить все
                  </button>
                </div>
              </div>
            </div>

            {/* Пагинация */}
            {getCategoryTotalPages("new") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("new"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true),
                true
              )}

            {getCategoryPaginatedData("new").length > 0 ? (
              renderCategoryTable(
                getCategoryPaginatedData("new"),
                getCategoryStartIndex(),
                "new"
              )
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">⭐</div>
                <div className="empty-state-message">
                  Нет товаров в категории "Новый"
                </div>
                {hasActiveGlobalFilters() && (
                  <div className="empty-state-suggestion">
                    Попробуйте изменить фильтры или очистить их
                  </div>
                )}
              </div>
            )}

            {/* Дублированная пагинация внизу */}
            {getCategoryTotalPages("new") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("new"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true)
              )}

            <div className="table-footer">
              Показано: {getCategoryPaginatedData("new").length} из{" "}
              {getCategorySortedData("new").length} товаров в категории "Новый"
              {hasActiveGlobalFilters() && (
                <span className="footer-section footer-section--warning">
                  {" "}
                  | Фильтры: {getGlobalFilterStats().join(", ")}
                </span>
              )}
            </div>
          </>
        )}

        {/* Секция "Оптимизация" */}
        {currentSection === "optimization_global" && (
          <>
            {renderGlobalFilters("optimization")}

            <div className="search-controls">
              <div className="search-controls-grid">
                <div className="search-inputs-group">
                  <div className="search-input-wrapper">
                    <label className="search-label">Поиск ID:</label>
                    <input
                      type="text"
                      value={globalViewFilters.searchId}
                      onChange={(e) =>
                        updateGlobalFiltersWithScroll({
                          searchId: e.target.value,
                          currentPage: 1,
                        })
                      }
                      placeholder="ID..."
                      className="search-input"
                    />
                  </div>
                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.showOnlyProm || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          showOnlyProm: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--prom">
                      Только PROM
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockZero || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockZero: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-zero">
                      Скрыть остаток CRM = 0
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockLowSix || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockLowSix: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-low">
                      Скрыть остаток CRM &lt; 6
                    </span>
                  </label>
                </div>
                <div className="search-actions">
                  <div className="search-counter">
                    Найдено: {getCategorySortedData("optimization").length}
                  </div>
                  <select
                    value={globalViewFilters.itemsPerPage}
                    onChange={(e) => {
                      setGlobalViewFilters((prev) => ({
                        ...prev,
                        itemsPerPage: Number(e.target.value),
                        currentPage: 1,
                      }));
                      resetTableScrollOnly();
                    }}
                    className="search-select"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                  <button
                    onClick={clearAllGlobalFilters}
                    className="clear-filters"
                  >
                    Сбросить все
                  </button>
                </div>
              </div>
            </div>

            {/* Пагинация */}
            {getCategoryTotalPages("optimization") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("optimization"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true),
                true
              )}

            {getCategoryPaginatedData("optimization").length > 0 ? (
              renderCategoryTable(
                getCategoryPaginatedData("optimization"),
                getCategoryStartIndex(),
                "optimization"
              )
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">⚙️</div>
                <div className="empty-state-message">
                  Нет товаров в категории "Оптимизация"
                </div>
                {hasActiveGlobalFilters() && (
                  <div className="empty-state-suggestion">
                    Попробуйте изменить фильтры или очистить их
                  </div>
                )}
              </div>
            )}

            {/* Дублированная пагинация внизу */}
            {getCategoryTotalPages("optimization") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("optimization"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true)
              )}

            <div className="table-footer">
              Показано: {getCategoryPaginatedData("optimization").length} из{" "}
              {getCategorySortedData("optimization").length} товаров в категории
              "Оптимизация"
              {hasActiveGlobalFilters() && (
                <span className="footer-section footer-section--warning">
                  {" "}
                  | Фильтры: {getGlobalFilterStats().join(", ")}
                </span>
              )}
            </div>
          </>
        )}

        {/* Секция "A/B" */}
        {currentSection === "ab_global" && (
          <>
            {renderGlobalFilters("ab")}

            <div className="search-controls">
              <div className="search-controls-grid">
                <div className="search-inputs-group">
                  <div className="search-input-wrapper">
                    <label className="search-label">Поиск ID:</label>
                    <input
                      type="text"
                      value={globalViewFilters.searchId}
                      onChange={(e) =>
                        updateGlobalFiltersWithScroll({
                          searchId: e.target.value,
                          currentPage: 1,
                        })
                      }
                      placeholder="ID..."
                      className="search-input"
                    />
                  </div>
                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.showOnlyProm || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          showOnlyProm: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--prom">
                      Только PROM
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockZero || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockZero: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-zero">
                      Скрыть остаток CRM = 0
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockLowSix || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockLowSix: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-low">
                      Скрыть остаток CRM &lt; 6
                    </span>
                  </label>
                </div>
                <div className="search-actions">
                  <div className="search-counter">
                    Найдено: {getCategorySortedData("ab").length}
                  </div>
                  <select
                    value={globalViewFilters.itemsPerPage}
                    onChange={(e) => {
                      setGlobalViewFilters((prev) => ({
                        ...prev,
                        itemsPerPage: Number(e.target.value),
                        currentPage: 1,
                      }));
                      resetTableScrollOnly();
                    }}
                    className="search-select"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                  <button
                    onClick={clearAllGlobalFilters}
                    className="clear-filters"
                  >
                    Сбросить все
                  </button>
                </div>
              </div>
            </div>

            {/* Пагинация */}
            {getCategoryTotalPages("ab") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("ab"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true),
                true
              )}

            {getCategoryPaginatedData("ab").length > 0 ? (
              renderCategoryTable(
                getCategoryPaginatedData("ab"),
                getCategoryStartIndex(),
                "ab"
              )
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-message">
                  Нет товаров в категории "A/B"
                </div>
                {hasActiveGlobalFilters() && (
                  <div className="empty-state-suggestion">
                    Попробуйте изменить фильтры или очистить их
                  </div>
                )}
              </div>
            )}

            {/* Дублированная пагинация внизу */}
            {getCategoryTotalPages("ab") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("ab"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true)
              )}

            <div className="table-footer">
              Показано: {getCategoryPaginatedData("ab").length} из{" "}
              {getCategorySortedData("ab").length} товаров в категории "A/B"
              {hasActiveGlobalFilters() && (
                <span className="footer-section footer-section--warning">
                  {" "}
                  | Фильтры: {getGlobalFilterStats().join(", ")}
                </span>
              )}
            </div>
          </>
        )}

        {/* Секция "С-Продажа" */}
        {currentSection === "c_sale_global" && (
          <>
            {renderGlobalFilters("c_sale")}

            <div className="search-controls">
              <div className="search-controls-grid">
                <div className="search-inputs-group">
                  <div className="search-input-wrapper">
                    <label className="search-label">Поиск ID:</label>
                    <input
                      type="text"
                      value={globalViewFilters.searchId}
                      onChange={(e) =>
                        updateGlobalFiltersWithScroll({
                          searchId: e.target.value,
                          currentPage: 1,
                        })
                      }
                      placeholder="ID..."
                      className="search-input"
                    />
                  </div>
                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.showOnlyProm || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          showOnlyProm: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--prom">
                      Только PROM
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockZero || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockZero: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-zero">
                      Скрыть остаток CRM = 0
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockLowSix || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockLowSix: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-low">
                      Скрыть остаток CRM &lt; 6
                    </span>
                  </label>
                </div>
                <div className="search-actions">
                  <div className="search-counter">
                    Найдено: {getCategorySortedData("c_sale").length}
                  </div>
                  <select
                    value={globalViewFilters.itemsPerPage}
                    onChange={(e) => {
                      setGlobalViewFilters((prev) => ({
                        ...prev,
                        itemsPerPage: Number(e.target.value),
                        currentPage: 1,
                      }));
                      resetTableScrollOnly();
                    }}
                    className="search-select"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                  <button
                    onClick={clearAllGlobalFilters}
                    className="clear-filters"
                  >
                    Сбросить все
                  </button>
                </div>
              </div>
            </div>

            {/* Пагинация */}
            {getCategoryTotalPages("c_sale") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("c_sale"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true),
                true
              )}

            {getCategoryPaginatedData("c_sale").length > 0 ? (
              renderCategoryTable(
                getCategoryPaginatedData("c_sale"),
                getCategoryStartIndex(),
                "c_sale"
              )
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📈</div>
                <div className="empty-state-message">
                  Нет товаров в категории "С-Продажа"
                </div>
                {hasActiveGlobalFilters() && (
                  <div className="empty-state-suggestion">
                    Попробуйте изменить фильтры или очистить их
                  </div>
                )}
              </div>
            )}

            {/* Дублированная пагинация внизу */}
            {getCategoryTotalPages("c_sale") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("c_sale"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true)
              )}

            <div className="table-footer">
              Показано: {getCategoryPaginatedData("c_sale").length} из{" "}
              {getCategorySortedData("c_sale").length} товаров в категории
              "С-Продажа"
              {hasActiveGlobalFilters() && (
                <span className="footer-section footer-section--warning">
                  {" "}
                  | Фильтры: {getGlobalFilterStats().join(", ")}
                </span>
              )}
            </div>
          </>
        )}

        {/* Секция "Несезон" */}
        {currentSection === "off_season_global" && (
          <>
            {renderGlobalFilters("off_season")}

            <div className="search-controls">
              <div className="search-controls-grid">
                <div className="search-inputs-group">
                  <div className="search-input-wrapper">
                    <label className="search-label">Поиск ID:</label>
                    <input
                      type="text"
                      value={globalViewFilters.searchId}
                      onChange={(e) =>
                        updateGlobalFiltersWithScroll({
                          searchId: e.target.value,
                          currentPage: 1,
                        })
                      }
                      placeholder="ID..."
                      className="search-input"
                    />
                  </div>
                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.showOnlyProm || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          showOnlyProm: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--prom">
                      Только PROM
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockZero || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockZero: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-zero">
                      Скрыть остаток CRM = 0
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockLowSix || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockLowSix: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-low">
                      Скрыть остаток CRM &lt; 6
                    </span>
                  </label>
                </div>
                <div className="search-actions">
                  <div className="search-counter">
                    Найдено: {getCategorySortedData("off_season").length}
                  </div>
                  <select
                    value={globalViewFilters.itemsPerPage}
                    onChange={(e) => {
                      setGlobalViewFilters((prev) => ({
                        ...prev,
                        itemsPerPage: Number(e.target.value),
                        currentPage: 1,
                      }));
                      resetTableScrollOnly();
                    }}
                    className="search-select"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                  <button
                    onClick={clearAllGlobalFilters}
                    className="clear-filters"
                  >
                    Сбросить все
                  </button>
                </div>
              </div>
            </div>

            {/* Пагинация */}
            {getCategoryTotalPages("off_season") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("off_season"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true),
                true
              )}

            {getCategoryPaginatedData("off_season").length > 0 ? (
              renderCategoryTable(
                getCategoryPaginatedData("off_season"),
                getCategoryStartIndex(),
                "off_season"
              )
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">❄️</div>
                <div className="empty-state-message">
                  Нет товаров в категории "Несезон"
                </div>
                {hasActiveGlobalFilters() && (
                  <div className="empty-state-suggestion">
                    Попробуйте изменить фильтры или очистить их
                  </div>
                )}
              </div>
            )}

            {/* Дублированная пагинация внизу */}
            {getCategoryTotalPages("off_season") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("off_season"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true)
              )}

            <div className="table-footer">
              Показано: {getCategoryPaginatedData("off_season").length} из{" "}
              {getCategorySortedData("off_season").length} товаров в категории
              "Несезон"
              {hasActiveGlobalFilters() && (
                <span className="footer-section footer-section--warning">
                  {" "}
                  | Фильтры: {getGlobalFilterStats().join(", ")}
                </span>
              )}
            </div>
          </>
        )}

        {/* Секция "Нерентабельные" */}
        {currentSection === "unprofitable_global" && (
          <>
            {renderGlobalFilters("unprofitable")}

            <div className="search-controls">
              <div className="search-controls-grid">
                <div className="search-inputs-group">
                  <div className="search-input-wrapper">
                    <label className="search-label">Поиск ID:</label>
                    <input
                      type="text"
                      value={globalViewFilters.searchId}
                      onChange={(e) =>
                        updateGlobalFiltersWithScroll({
                          searchId: e.target.value,
                          currentPage: 1,
                        })
                      }
                      placeholder="ID..."
                      className="search-input"
                    />
                  </div>
                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.showOnlyProm || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          showOnlyProm: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--prom">
                      Только PROM
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockZero || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockZero: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-zero">
                      Скрыть остаток CRM = 0
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={globalViewFilters.hideCrmStockLowSix || false}
                      onChange={(e) =>
                        setGlobalViewFilters((prev) => ({
                          ...prev,
                          hideCrmStockLowSix: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-low">
                      Скрыть остаток CRM &lt; 6
                    </span>
                  </label>
                </div>
                <div className="search-actions">
                  <div className="search-counter">
                    Найдено: {getCategorySortedData("unprofitable").length}
                  </div>
                  <select
                    value={globalViewFilters.itemsPerPage}
                    onChange={(e) => {
                      setGlobalViewFilters((prev) => ({
                        ...prev,
                        itemsPerPage: Number(e.target.value),
                        currentPage: 1,
                      }));
                      resetTableScrollOnly();
                    }}
                    className="search-select"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                  <button
                    onClick={clearAllGlobalFilters}
                    className="clear-filters"
                  >
                    Сбросить все
                  </button>
                </div>
              </div>
            </div>

            {/* Пагинация */}
            {getCategoryTotalPages("unprofitable") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("unprofitable"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true),
                true
              )}

            {getCategoryPaginatedData("unprofitable").length > 0 ? (
              renderCategoryTable(
                getCategoryPaginatedData("unprofitable"),
                getCategoryStartIndex(),
                "unprofitable"
              )
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">❌</div>
                <div className="empty-state-message">
                  Нет товаров в категории "Нерентабельные"
                </div>
                {hasActiveGlobalFilters() && (
                  <div className="empty-state-suggestion">
                    Попробуйте изменить фильтры или очистить их
                  </div>
                )}
              </div>
            )}

            {/* Дублированная пагинация внизу */}
            {getCategoryTotalPages("unprofitable") > 1 &&
              renderPagination(
                globalViewFilters.currentPage,
                getCategoryTotalPages("unprofitable"),
                (page) =>
                  updateGlobalFiltersWithScroll({ currentPage: page }, true)
              )}

            <div className="table-footer">
              Показано: {getCategoryPaginatedData("unprofitable").length} из{" "}
              {getCategorySortedData("unprofitable").length} товаров в категории
              "Нерентабельные"
              {hasActiveGlobalFilters() && (
                <span className="footer-section footer-section--warning">
                  {" "}
                  | Фильтры: {getGlobalFilterStats().join(", ")}
                </span>
              )}
            </div>
          </>
        )}

        {currentSection === "table" && activeTable && (
          <>
            {/* Управление таблицами */}
            <div className="tables-management">
              <div className="tables-management-header">
                <h3 className="tables-management-title">
                  <span className="icon icon--table"></span>
                  Таблицы ({tables.length})
                </h3>
                <div className="tables-management-controls">
                  <button
                    onClick={() => setCurrentSection("upload")}
                    className="xml-button xml-button--actions"
                  >
                    <span className="icon icon--plus"></span> Добавить
                  </button>
                </div>
              </div>
              <div className="tables-tabs">
                {tables
                  .sort(
                    (a, b) => new Date(b.uploadTime) - new Date(a.uploadTime)
                  )
                  .map((table) => (
                    <div
                      key={table.id}
                      onClick={() => {
                        setActiveTableId(table.id);
                      }}
                      className={`table-tab ${
                        activeTableId === table.id
                          ? "table-tab--active"
                          : "table-tab--inactive"
                      }`}
                    >
                      <div className="table-tab-header">
                        <div
                          className={`table-tab-title ${
                            activeTableId === table.id
                              ? "table-tab-title--active"
                              : "table-tab-title--inactive"
                          }`}
                        >
                          {table.name}
                          {activeTableId === table.id && (
                            <span className="table-tab-badge">(активная)</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => closeTable(table.id, e)}
                          disabled={isDeletingTable === table.id}
                          className={`table-tab-close ${
                            isDeletingTable === table.id
                              ? "table-tab-close--deleting"
                              : ""
                          }`}
                        >
                          {isDeletingTable === table.id ? (
                            <span className="icon icon--loading">⏳</span>
                          ) : (
                            <span className="icon icon--close"></span>
                          )}
                        </button>
                      </div>
                      <div className="table-tab-date">
                        {formatDateTime(table.uploadTime)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Фильтры по диапазонам - НОВАЯ СТРУКТУРА в 2 ряда по 5 параметров */}
            <div className="range-filters">
              <h5 className="range-filters-title">Фильтры по диапазонам:</h5>
              <div className="range-filters-grid">
                {[
                  { key: "baseCost", label: "Себестоимость" },
                  { key: "stock", label: "Остаток" },
                  { key: "daysStock", label: "Запас дн." },
                  { key: "salesMonth", label: "Продаж/мес" },
                  {
                    key: "applicationsMonth",
                    label: "Заявки/мес",
                    color: "applications",
                  },
                  { key: "sales2Weeks", label: "Продаж/2нед" },
                  {
                    key: "applications2Weeks",
                    label: "Заявки/2нед",
                    color: "applications",
                  },
                  { key: "crmStock", label: "Остаток CRM", color: "crm-stock" },
                  { key: "crmPrice", label: "Цена CRM", color: "crm-price" },
                  { key: "promPrice", label: "Цена PROM", color: "prom-price" },
                ].map((filter) => (
                  <div key={filter.key} className="range-filter">
                    <div
                      className={`range-filter-label range-filter-label--${
                        filter.color || "default"
                      }`}
                    >
                      {filter.label}
                    </div>
                    <div className="range-filter-inputs">
                      <input
                        type="number"
                        placeholder="От"
                        value={currentFilters.rangeFilters[filter.key].min}
                        onChange={(e) =>
                          updateRangeFilter(filter.key, "min", e.target.value)
                        }
                        className="range-input"
                      />
                      <span className="range-separator">—</span>
                      <input
                        type="number"
                        placeholder="До"
                        value={currentFilters.rangeFilters[filter.key].max}
                        onChange={(e) =>
                          updateRangeFilter(filter.key, "max", e.target.value)
                        }
                        className="range-input"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Раскрывающиеся CRM категории */}
              {availableCrmCategories.length > 0 &&
                activeTableId &&
                xmlLastUpdate[`table_${activeTableId}`] && (
                  <div className="crm-categories">
                    <div
                      className="crm-categories-header"
                      onClick={() =>
                        setIsCrmCategoriesExpanded(!isCrmCategoriesExpanded)
                      }
                    >
                      <div className="crm-categories-title">
                        Скрыть категории CRM ({availableCrmCategories.length}{" "}
                        доступно):
                      </div>
                      <div
                        className={`crm-categories-toggle ${
                          isCrmCategoriesExpanded
                            ? "crm-categories-toggle--expanded"
                            : ""
                        }`}
                      >
                        ▼
                      </div>
                    </div>
                    <div
                      className={`crm-categories-content ${
                        isCrmCategoriesExpanded
                          ? "crm-categories-content--expanded"
                          : ""
                      }`}
                    >
                      <div className="crm-categories-grid">
                        {availableCrmCategories.map((category) => (
                          <label
                            key={category.id}
                            className={`crm-category-label ${
                              currentFilters.hiddenCrmCategories.includes(
                                category.id
                              )
                                ? "crm-category-label--hidden"
                                : "crm-category-label--visible"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={currentFilters.hiddenCrmCategories.includes(
                                category.id
                              )}
                              onChange={() =>
                                handleCrmCategoryToggle(category.id)
                              }
                              className="crm-category-checkbox"
                            />
                            <span className="crm-category-id">
                              ID:{category.id}
                            </span>
                            <span>{category.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* Поиск и управление - ПЕРЕМЕЩЕННЫЕ ПОД ФИЛЬТРЫ */}
            <div className="search-controls">
              <div className="search-controls-grid">
                <div className="search-inputs-group">
                  <div className="search-input-wrapper">
                    <label className="search-label">Поиск ID:</label>
                    <input
                      type="text"
                      value={currentFilters.searchId}
                      onChange={(e) =>
                        updateTableFilters({
                          searchId: e.target.value,
                          currentPage: 1,
                        })
                      }
                      placeholder="ID..."
                      className="search-input"
                    />
                  </div>
                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={currentFilters.showOnlyProm}
                      onChange={(e) =>
                        updateTableFilters({
                          showOnlyProm: e.target.checked,
                          currentPage: 1,
                        })
                      }
                    />
                    <span className="checkbox-label checkbox-text--prom">
                      Только PROM
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={currentFilters.hideCrmStockZero}
                      onChange={(e) =>
                        updateTableFilters({
                          hideCrmStockZero: e.target.checked,
                          currentPage: 1,
                        })
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-zero">
                      Скрыть остаток CRM = 0
                    </span>
                  </label>

                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={currentFilters.hideCrmStockLowSix}
                      onChange={(e) =>
                        updateTableFilters({
                          hideCrmStockLowSix: e.target.checked,
                          currentPage: 1,
                        })
                      }
                    />
                    <span className="checkbox-label checkbox-text--crm-low">
                      Скрыть остаток CRM &lt; 6
                    </span>
                  </label>
                </div>
                <div className="search-actions">
                  <div className="search-counter">
                    Найдено: {sortedData.length}
                  </div>
                  <select
                    value={currentFilters.itemsPerPage}
                    onChange={(e) =>
                      updateTableFilters({
                        itemsPerPage: Number(e.target.value),
                        currentPage: 1,
                      })
                    }
                    className="search-select"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                  <div className="xml-update-compact">
                    <button
                      onClick={updateTableXmlData}
                      disabled={
                        tableXmlLoadingStatus[activeTableId]?.crm ===
                          "loading" ||
                        tableXmlLoadingStatus[activeTableId]?.prom === "loading"
                      }
                      className={`xml-update-button ${
                        tableXmlLoadingStatus[activeTableId]?.crm ===
                          "loading" ||
                        tableXmlLoadingStatus[activeTableId]?.prom === "loading"
                          ? "xml-update-button--loading"
                          : ""
                      }`}
                    >
                      {tableXmlLoadingStatus[activeTableId]?.crm ===
                        "loading" ||
                      tableXmlLoadingStatus[activeTableId]?.prom === "loading"
                        ? "⏳ Обновление..."
                        : "🔄 Обновить XML"}
                    </button>
                    <div className="xml-update-date">
                      {xmlLastUpdate[`table_${activeTableId}`]
                        ? formatDateTime(
                            xmlLastUpdate[`table_${activeTableId}`]
                          )
                        : "Не обновлялось"}
                    </div>
                  </div>
                  {hasActiveFilters() && (
                    <button onClick={clearAllFilters} className="clear-filters">
                      Сбросить все
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Пагинация */}
            {totalPages > 1 &&
              renderPagination(
                currentFilters.currentPage,
                totalPages,
                (page) => updateTableFilters({ currentPage: page }, true),
                true
              )}

            {/* Таблица */}
            {renderTable(paginatedData, startIndex)}

            {/* Дублированная пагинация внизу */}
            {totalPages > 1 &&
              renderPagination(
                currentFilters.currentPage,
                totalPages,
                (page) => updateTableFilters({ currentPage: page }, true),
                true
              )}

            <div className="table-footer">
              Показано: {paginatedData.length} из {sortedData.length} (всего{" "}
              {data.length})
              {activeTable && (
                <>
                  {" | "}
                  <span
                    className={`footer-section ${
                      activeTable.data.some((item) => item.crmPrice !== null)
                        ? ""
                        : "footer-section--error"
                    }`}
                  >
                    CRM:{" "}
                    {activeTable.data.some((item) => item.crmPrice !== null)
                      ? `✅ ${
                          activeTable.data.filter(
                            (item) => item.crmPrice !== null
                          ).length
                        } поз.`
                      : "○ не загружен"}
                  </span>
                  {" | "}
                  <span
                    className={`footer-section footer-section--prom ${
                      activeTable.data.some((item) => item.promPrice !== null)
                        ? ""
                        : "footer-section--error"
                    }`}
                  >
                    PROM:{" "}
                    {activeTable.data.some((item) => item.promPrice !== null)
                      ? `✅ ${
                          activeTable.data.filter(
                            (item) => item.promPrice !== null
                          ).length
                        } поз.`
                      : "○ не загружен"}
                  </span>
                </>
              )}
              {xmlLastUpdate[`table_${activeTableId}`] && (
                <span className="footer-section">
                  {" "}
                  | XML обновлено:{" "}
                  {formatDateTime(xmlLastUpdate[`table_${activeTableId}`])}
                </span>
              )}
              {currentFilters.showOnlyProm && (
                <span className="footer-section footer-section--prom">
                  {" "}
                  | Только PROM
                </span>
              )}
              {currentFilters.hideCrmStockZero && (
                <span className="footer-section footer-section--error">
                  {" "}
                  | Скрыто: остаток CRM = 0
                </span>
              )}
              {currentFilters.hideCrmStockLowSix && (
                <span className="footer-section footer-section--orange">
                  {" "}
                  | Скрыто: остаток CRM &lt; 6
                </span>
              )}
              {currentFilters.hiddenCrmCategories.length > 0 && (
                <span className="footer-section footer-section--error">
                  {" "}
                  | Скрыто: {currentFilters.hiddenCrmCategories.length} кат.
                </span>
              )}
            </div>
          </>
        )}

        {/* Модальные окна */}
        {showPriceHistory && (
          <div
            className="modal-overlay"
            onClick={() => setShowPriceHistory(null)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">
                  История цен - {showPriceHistory.id}
                </h3>
                <button
                  onClick={() => setShowPriceHistory(null)}
                  className="modal-close"
                >
                  <span className="icon icon--close"></span>
                </button>
              </div>
              <div className="modal-body">
                {showPriceHistory.priceHistory &&
                showPriceHistory.priceHistory.length > 0 ? (
                  <div>
                    {showPriceHistory.priceHistory
                      .slice()
                      .reverse()
                      .map((change, index) => (
                        <div
                          key={index}
                          className={`price-history-item ${
                            index === 0
                              ? "price-history-item--current"
                              : "price-history-item--past"
                          }`}
                        >
                          <div className="price-history-header">
                            <strong
                              className={`price-history-price ${
                                index === 0
                                  ? "price-history-price--current"
                                  : "price-history-price--past"
                              }`}
                            >
                              {(change.price || 0).toFixed(2)} ₴
                              {index === 0 && (
                                <span className="price-history-badge">
                                  (текущая)
                                </span>
                              )}
                            </strong>
                            <span className="price-history-date">
                              {new Date(change.date).toLocaleDateString()}
                            </span>
                          </div>

                          {change.tableName && (
                            <div className="price-history-table">
                              📋 Таблица: {change.tableName}
                            </div>
                          )}

                          {change.previousPrice !== null &&
                            change.previousPrice !== undefined && (
                              <div className="price-history-previous">
                                Предыдущая:{" "}
                                {(change.previousPrice || 0).toFixed(2)} ₴
                              </div>
                            )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="price-history-empty">История изменений пуста</p>
                )}
              </div>
            </div>
          </div>
        )}

        {showComments && (
          <div className="modal-overlay" onClick={() => setShowComments(null)}>
            <div
              className="modal-content modal-content--wide"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">Комментарии - {showComments.id}</h3>
                <button
                  onClick={() => setShowComments(null)}
                  className="modal-close"
                >
                  <span className="icon icon--close"></span>
                </button>
              </div>

              <div className="comment-form">
                <div className="comment-form-title">Новый комментарий:</div>
                <div className="comment-form-inputs">
                  <textarea
                    value={newCommentInput}
                    onChange={(e) => setNewCommentInput(e.target.value)}
                    placeholder="Комментарий..."
                    className="comment-textarea"
                  />
                  <button
                    onClick={() => addComment(showComments.id)}
                    disabled={!newCommentInput.trim()}
                    className={`comment-submit ${
                      !newCommentInput.trim()
                        ? "comment-submit--disabled"
                        : "comment-submit--enabled"
                    }`}
                  >
                    Добавить
                  </button>
                </div>
              </div>

              <div className="modal-body">
                {showComments.comments && showComments.comments.length > 0 ? (
                  <div>
                    {showComments.comments
                      .slice()
                      .reverse()
                      .map((comment) => (
                        <div key={comment.id} className="comment-item">
                          <div className="comment-content">
                            <div className="comment-text-section">
                              <div className="comment-text">{comment.text}</div>
                              <div className="comment-meta">
                                <span className="comment-date">
                                  {new Date(comment.date).toLocaleDateString()}
                                </span>
                                {comment.tableName && (
                                  <span className="comment-table-badge">
                                    📋 {comment.tableName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                deleteComment(showComments.id, comment.id)
                              }
                              className="comment-delete"
                            >
                              <span className="icon icon--close"></span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="comments-empty">Комментариев пока нет</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryCalculator;
