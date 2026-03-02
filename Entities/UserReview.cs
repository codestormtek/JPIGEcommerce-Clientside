namespace BlazorApp1.Entities
{
    public class UserReview : Entity
    {
        public Guid UserId { get; set; }
        public SiteUser User { get; set; } = default!;

        public Guid ProductId { get; set; }
        public Product Product { get; set; } = default!;

        public Guid? OrderLineId { get; set; }
        public OrderLine? OrderLine { get; set; }

        public byte RatingValue { get; set; } // 1..5
        public string? Comment { get; set; }
        public bool IsApproved { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }



}
