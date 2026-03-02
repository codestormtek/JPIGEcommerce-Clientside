namespace BlazorApp1.Entities
{
    public class MessageDeliveryLog : Entity
    {
        public Guid OutboxId { get; set; }
        public MessageOutbox Outbox { get; set; } = default!;
        public int Attempt { get; set; }
        public string Status { get; set; } = default!;
        public string? ResponseJson { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }



}
