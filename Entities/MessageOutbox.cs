namespace BlazorApp1.Entities
{
    public class MessageOutbox : Entity
    {
        public string Channel { get; set; } = default!; // email|sms
        public string ToAddress { get; set; } = default!;
        public string TemplateKey { get; set; } = default!;
        public string? Subject { get; set; }
        public string PayloadJson { get; set; } = default!;
        public string Status { get; set; } = "queued"; // queued|sending|sent|failed
        public string? Provider { get; set; }
        public string? ProviderMessageId { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? SentAt { get; set; }
        public string? LastError { get; set; }

        public ICollection<MessageDeliveryLog> DeliveryLogs { get; set; } = new List<MessageDeliveryLog>();
    }



}
