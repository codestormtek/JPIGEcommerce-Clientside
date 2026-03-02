namespace BlazorApp1.Entities
{
    public class OrderStatusHistory : Entity
    {
        public Guid OrderId { get; set; }
        public ShopOrder Order { get; set; } = default!;

        public Guid? OldStatusId { get; set; }
        public OrderStatus? OldStatus { get; set; }

        public Guid NewStatusId { get; set; }
        public OrderStatus NewStatus { get; set; } = default!;

        public DateTimeOffset ChangedAt { get; set; }
        public Guid? ChangedByUserId { get; set; }
        public SiteUser? ChangedByUser { get; set; }
    }



}
