namespace BlazorApp1.Entities
{
    public class UserContactPreference
    {
        public Guid UserId { get; set; }
        public SiteUser User { get; set; } = default!;

        public bool OptInEmail { get; set; } = true;
        public bool OptInSms { get; set; }
        public string? SmsPhone { get; set; }
        public string? PreferredLanguage { get; set; }
        public string? Timezone { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
    }



}
