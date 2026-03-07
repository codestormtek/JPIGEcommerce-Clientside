const menu = [
  // ─── THE JIGGLING PIG ADMIN ───────────────────────────────────────────────

  { heading: "Dashboard" },
  { icon: "dashboard", text: "Store Overview", link: "/" },

  { heading: "Sales" },
  {
    icon: "cart",
    text: "Orders",
    subMenu: [
      { text: "Order List",   link: "/orders" },
      { text: "Order Detail", link: "/orders/:id" },
    ],
  },

  {
    icon: "truck",
    text: "Shipments",
    subMenu: [
      { text: "Shipment List",   link: "/shipments" },
      { text: "Shipment Detail", link: "/shipments/:id" },
    ],
  },
  {
    icon: "star",
    text: "Reviews",
    link: "/reviews",
  },

  { heading: "Catalog" },
  {
    icon: "package",
    text: "Products",
    subMenu: [
      { text: "Product List", link: "/products" },
      { text: "Add Product",  link: "/products/create" },
    ],
  },
  {
    icon: "label",
    text: "Categories & Brands",
    subMenu: [
      { text: "Categories", link: "/categories" },
      { text: "Brands",     link: "/brands" },
    ],
  },
  {
    icon: "box",
    text: "Inventory",
    link: "/inventory",
  },

  { heading: "Customers" },
  {
    icon: "users",
    text: "Customers",
    subMenu: [
      { text: "Customer List",   link: "/customers" },
      { text: "Customer Detail", link: "/customers/:id" },
    ],
  },
  {
    icon: "location",
    text: "Addresses",
    link: "/addresses",
  },
  {
    icon: "wallet",
    text: "Payment Methods",
    link: "/payment-methods",
  },

  { heading: "Promotions" },
  {
    icon: "percent",
    text: "Promotions",
    subMenu: [
      { text: "Promotion List", link: "/promotions" },
      { text: "Add Promotion",  link: "/promotions/create" },
    ],
  },
  {
    icon: "ticket-alt",
    text: "Coupons",
    subMenu: [
      { text: "Coupon List", link: "/coupons" },
      { text: "Add Coupon",  link: "/coupons/create" },
    ],
  },

  { heading: "Catering & Menus" },
  {
    icon: "clip",
    text: "Catering Menus",
    subMenu: [
      { text: "Menu List",    link: "/menus" },
      { text: "Menu Builder", link: "/menus/:id" },
    ],
  },
  {
    icon: "list",
    text: "Menu Items",
    link: "/menu-items",
  },
  {
    icon: "map-pin",
    text: "Locations",
    subMenu: [
      { text: "Location List",   link: "/locations" },
      { text: "Location Detail", link: "/locations/:id" },
    ],
  },
  {
    icon: "calender-date",
    text: "Schedule & Events",
    subMenu: [
      { text: "Event Calendar", link: "/schedule" },
      { text: "Event List",     link: "/schedule/list" },
    ],
  },
  {
    icon: "truck",
    text: "Truck Fleet",
    link: "/trucks",
  },

  { heading: "Content" },
  {
    icon: "layout",
    text: "Carousel Slider",
    link: "/carousel",
  },
  {
    icon: "pen",
    text: "Blog Posts",
    subMenu: [
      { text: "Post List", link: "/blog" },
      { text: "Add Post",  link: "/blog/create" },
    ],
  },
  {
    icon: "news",
    text: "News Articles",
    subMenu: [
      { text: "Article List", link: "/news" },
      { text: "Add Article",  link: "/news/create" },
    ],
  },
  {
    icon: "file-text",
    text: "Pages",
    subMenu: [
      { text: "Page List", link: "/pages" },
      { text: "Edit Page", link: "/pages/:id" },
    ],
  },
  {
    icon: "book",
    text: "Recipes",
    subMenu: [
      { text: "Recipe List", link: "/recipes" },
      { text: "Add Recipe",  link: "/recipes/create" },
    ],
  },

  { heading: "Media" },
  {
    icon: "img",
    text: "Media Library",
    subMenu: [
      { text: "All Files", link: "/media" },
      { text: "Upload",    link: "/media/upload" },
    ],
  },

  { heading: "Communications" },
  {
    icon: "mail",
    text: "Message Templates",
    subMenu: [
      { text: "Template List", link: "/templates" },
      { text: "Edit Template", link: "/templates/:id" },
    ],
  },
  {
    icon: "send",
    text: "Message Outbox",
    link: "/outbox",
  },
  {
    icon: "contact",
    text: "Subscribers",
    link: "/subscribers",
  },
  {
    icon: "bell",
    text: "Notifications",
    link: "/notification-subs",
  },

  { heading: "Reports & Analytics" },
  {
    icon: "bar-chart",
    text: "Metrics & KPIs",
    subMenu: [
      { text: "Dashboard Metrics", link: "/metrics" },
      { text: "Manage Dashboards", link: "/dashboards" },
    ],
  },
  {
    icon: "download",
    text: "Export Jobs",
    link: "/exports",
  },

  { heading: "Tools" },
  {
    icon: "check-circle",
    text: "Checklists",
    link: "/checklists",
  },

  { heading: "System" },
  {
    icon: "user-add",
    text: "Admin Users",
    subMenu: [
      { text: "User List", link: "/admin/users" },
      { text: "Add Admin", link: "/admin/users/create" },
    ],
  },
  {
    icon: "truck",
    text: "Shipping Methods",
    link: "/admin/shipping-methods",
  },
  {
    icon: "list-check",
    text: "Order Statuses",
    link: "/admin/order-statuses",
  },
  {
    icon: "shield",
    text: "Audit Logs",
    link: "/admin/audit-logs",
  },
  {
    icon: "clock",
    text: "Scheduled Tasks",
    link: "/scheduled-tasks",
  },

  // ─── SAMPLE & DEMO COMPONENTS ─────────────────────────────────────────────
  { heading: "─── Sample / Demo ───" },
  {
    heading: "Dashboards",
  },
  {
    icon: "dashboard",
    text: "Default Dashboard",
    link: "/",
  },
  {
    icon: "speed",
    text: "Sales Dashboard",
    link: "/sales",
  },
  {
    icon: "bitcoin-cash",
    text: "Crypto Dashboard",
    link: "/crypto",
  },
  {
    icon: "coins",
    text: "Invest Dashboard",
    link: "/invest",
  },
  {
    heading: "Pre-built Pages",
  },
  {
    icon: "tile-thumb",
    text: "Projects",
    subMenu: [
      {
        text: "Project Cards",
        link: "/project-card",
      },
      {
        text: "Project List",
        link: "/project-list",
      },
    ],
  },
  {
    icon: "users",
    text: "User Manage",
    subMenu: [
      {
        text: "User List - Regular",
        link: "/user-list-regular",
      },
      {
        text: "User List - Compact",
        link: "/user-list-compact",
      },
      {
        text: "User Details - Regular",
        link: "/user-details-regular/1",
      },
      {
        text: "User Profile - Regular",
        link: "/user-profile-regular",
      },
      {
        text: "User Contact - Card",
        link: "/user-contact-card",
      },
    ],
  },
  {
    icon: "file-docs",
    text: "AML / KYCs",
    subMenu: [
      {
        text: "KYC List - Regular",
        link: "/kyc-list-regular",
      },
      {
        text: "KYC Details - Regular",
        link: "/kyc-details-regular/UD01544",
      },
    ],
  },
  {
    icon: "tranx",
    text: "Transaction",
    subMenu: [
      {
        text: "Trans List - Basic",
        link: "/transaction-basic",
      },
      {
        text: "Trans List - Crypto",
        link: "/transaction-crypto",
      },
    ],
  },
  {
    icon: "card-view",
    text: "Products",
    subMenu: [
      {
        text: "Product List",
        link: "/product-list",
      },
      {
        text: "Product Card",
        link: "/product-card",
      },
      {
        text: "Product Details",
        link: "/product-details/0",
      },
    ],
  },
  {
    icon: "file-docs",
    text: "Invoice",
    subMenu: [
      {
        text: "Invoice List",
        link: "/invoice-list",
      },
      {
        text: "Invoice Details",
        link: "/invoice-details/1",
      },
    ],
  },
  {
    icon: "view-col",
    text: "Pricing Table",
    link: "/pricing-table",
  },
  {
    icon: "img",
    text: "Image Gallery",
    link: "/image-gallery",
  },
  {
    heading: "Misc Pages",
  },
  {
    icon: "signin",
    text: "Auth Pages",
    subMenu: [
      {
        text: "Login / Signin",
        link: "/auth-login",
        newTab: true,
      },
      {
        text: "Register / Signup",
        link: "/auth-register",
        newTab: true,
      },
      {
        text: "Forgot Password",
        link: "/auth-reset",
        newTab: true,
      },
      {
        text: "Success / Confirm",
        link: "/auth-success",
        newTab: true,
      },
    ],
  },
  {
    icon: "files",
    text: "Error Pages",
    subMenu: [
      {
        text: "404 Classic",
        link: "/errors/404-classic",
        newTab: true,
      },
      {
        text: "504 Classic",
        link: "/errors/504-classic",
        newTab: true,
      },
      {
        text: "404 Modern",
        link: "/errors/404-modern",
        newTab: true,
      },
      {
        text: "504 Modern",
        link: "/errors/504-modern",
        newTab: true,
      },
    ],
  },
  {
    icon: "files",
    text: "Other Pages",
    subMenu: [
      {
        text: "Blank / Startup",
        link: "/_blank",
      },
      {
        text: "Faqs / Help",
        link: "/pages/faq",
      },
      {
        text: "Terms / Policy",
        link: "/pages/terms-policy",
      },
      {
        text: "Regular Page - v1",
        link: "/pages/regular-v1",
      },
      {
        text: "Regular Page - v2",
        link: "/pages/regular-v2",
      },
    ],
  },
  {
    heading: "Components",
  },
  {
    icon: "layers",
    text: "Ui Elements",
    subMenu: [
      {
        text: "Alerts",
        link: "/components/alerts",
      },
      {
        text: "Accordions",
        link: "/components/accordions",
      },
      {
        text: "Avatar",
        link: "/components/avatar",
      },
      {
        text: "Badges",
        link: "/components/badges",
      },
      {
        text: "Buttons",
        link: "/components/buttons",
      },
      {
        text: "Button Group",
        link: "/components/button-group",
      },
      {
        text: "Breadcrumbs",
        link: "/components/breadcrumbs",
      },
      {
        text: "Cards",
        link: "/components/cards",
      },
      {
        text: "Carousel",
        link: "/components/carousel",
      },
      {
        text: "Dropdowns",
        link: "/components/dropdowns",
      },
      {
        text: "Modals",
        link: "/components/modals",
      },
      {
        text: "Pagination",
        link: "/components/pagination",
      },
      {
        text: "Popovers",
        link: "/components/popovers",
      },
      {
        text: "Progress",
        link: "/components/progress",
      },
      {
        text: "Spinner",
        link: "/components/spinner",
      },
      {
        text: "Tabs",
        link: "/components/tabs",
      },
      {
        text: "Toast",
        link: "/components/toast",
      },
      {
        text: "Typography",
        link: "/components/typography",
      },
      {
        text: "Tooltips",
        link: "/components/tooltips",
      },
      {
        text: "Utilities",
        subMenu: [
          {
            text: "Borders",
            link: "/components/util-border",
          },
          {
            text: "Colors",
            link: "/components/util-colors",
          },
          {
            text: "Display",
            link: "/components/util-display",
          },
          {
            text: "Embeded",
            link: "/components/util-embeded",
          },
          {
            text: "Flex",
            link: "/components/util-flex",
          },
          {
            text: "Text",
            link: "/components/util-text",
          },
          {
            text: "Sizing",
            link: "/components/util-sizing",
          },
          {
            text: "Spacing",
            link: "/components/util-spacing",
          },
          {
            text: "Others",
            link: "/components/util-others",
          },
        ],
      },
    ],
  },
  {
    icon: "dot-box",
    text: "Crafted Icons",
    subMenu: [
      {
        text: "SVG Icon-Exclusive",
        link: "/svg-icons",
      },
      {
        text: "Nioicon - HandCrafted",
        link: "/nioicon",
      },
    ],
  },
  {
    icon: "table-view",
    text: "Tables",
    subMenu: [
      {
        text: "Basic Tables",
        link: "/table-basic",
      },
      {
        text: "Special Tables",
        link: "/table-special",
      },
      {
        text: "DataTables",
        link: "/table-datatable",
      },
    ],
  },
  {
    icon: "card-view",
    text: "Forms",
    subMenu: [
      {
        text: "Form Elements",
        link: "/components/form-elements",
      },
      {
        text: "Checkbox Radio",
        link: "/components/checkbox-radio",
      },
      {
        text: "Advanced Controls",
        link: "/components/advanced-control",
      },
      {
        text: "Input Group",
        link: "/components/input-group",
      },
      {
        text: "Form Upload",
        link: "/components/form-upload",
      },
      {
        text: "Form Layouts",
        link: "/components/form-layouts",
      },
      {
        text: "Form Validation",
        link: "/components/form-validation",
      },
      {
        text: "Date Time Picker",
        link: "/components/datetime-picker",
      },
      {
        text: "Number Spinner",
        link: "/components/number-spinner",
      },
      {
        text: "noUiSlider",
        link: "/components/nouislider",
      },
      {
        text: "Wizard Basic",
        link: "/components/wizard-basic",
      },
      {
        text: "Rich Editor",
        subMenu: [
          {
            text: "Quill",
            link: "/components/quill",
          },
          {
            text: "Tinymce",
            link: "/components/tinymce",
          },
        ],
      },
    ],
  },
  {
    icon: "pie",
    text: "Charts",
    subMenu: [
      {
        text: "Chart Js",
        link: "/charts/chartjs",
      },
      {
        text: "Knobs",
        link: "/charts/knobs",
      },
    ],
  },
  {
    icon: "puzzle",
    text: "Widgets",
    subMenu: [
      {
        text: "Card Widgets",
        link: "/components/widgets/cards",
      },
      {
        text: "Chart Widgets",
        link: "/components/widgets/charts",
      },
      {
        text: "Rating Widgets",
        link: "/components/widgets/rating",
      },
    ],
  },
  {
    icon: "block-over",
    text: "Miscellaneous",
    subMenu: [
      {
        text: "Slick Sliders",
        link: "/components/misc/slick-slider",
      },
      {
        text: "Tree View",
        link: "/components/misc/tree-view",
      },
      {
        text: "React Toastify",
        link: "/components/misc/toastify",
      },
      {
        text: "Sweet Alert",
        link: "/components/misc/sweet-alert",
      },
      {
        text: "React DualListBox",
        link: "/components/misc/dual-list",
      },
      {
        text: "Dnd Kit",
        link: "/components/misc/dnd",
      },
      {
        text: "Google Map",
        link: "/components/misc/map",
      },
    ],
  },
  {
    icon: "text-rich",
    text: "Email Template",
    link: "/email-template",
  },
];
export default menu;
