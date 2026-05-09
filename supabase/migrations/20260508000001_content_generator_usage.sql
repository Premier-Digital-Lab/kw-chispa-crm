-- Track daily image and video generation limits per user
CREATE TABLE public.content_generator_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_type text NOT NULL CHECK (usage_type IN ('image', 'video')),
    used_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.content_generator_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see and insert their own usage
CREATE POLICY "Users can view own usage" ON public.content_generator_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.content_generator_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can see all
CREATE POLICY "Admins can view all usage" ON public.content_generator_usage
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sales
            WHERE sales.user_id = auth.uid()
            AND sales.administrator = true
        )
    );
