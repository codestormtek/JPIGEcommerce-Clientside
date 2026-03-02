namespace BlazorApp1.Entities
{
    public class Payment : Entity
    {
        public Guid OrderId { get; set; }
        public ShopOrder Order { get; set; } = default!;

        public Guid? PaymentMethodTokenId { get; set; }
        public PaymentMethodToken? PaymentMethodToken { get; set; }

        public string Provider { get; set; } = default!;
        public decimal Amount { get; set; }
        public string Status { get; set; } = default!; // authorized|captured|failed|refunded
        public string? ProviderTxnId { get; set; }

        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? AuthorizedAt { get; set; }
        public DateTimeOffset? CapturedAt { get; set; }
    }



}
