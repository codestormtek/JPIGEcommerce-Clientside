namespace BlazorApp1.Entities
{
    public class PaymentMethodToken : Entity
    {
        public Guid UserId { get; set; }
        public SiteUser User { get; set; } = default!;

        public string Provider { get; set; } = default!;
        public string Token { get; set; } = default!;
        public string? Brand { get; set; }
        public string? Last4 { get; set; }
        public byte? ExpMonth { get; set; }
        public short? ExpYear { get; set; }
        public bool IsDefault { get; set; }

        public DateTimeOffset CreatedAt { get; set; }
    }



}
