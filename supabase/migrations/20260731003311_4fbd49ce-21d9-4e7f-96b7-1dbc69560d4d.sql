CREATE OR REPLACE FUNCTION public.notify_order_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  svc text;
BEGIN
  IF NEW.status::text NOT IN ('completed','delivered') THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = NEW.status::text THEN
    RETURN NULL;
  END IF;
  IF NEW.customer_email IS NULL OR NEW.customer_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO svc
  FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key';

  IF svc IS NULL THEN
    RAISE WARNING 'notify_order_delivered: missing service role secret';
    RETURN NULL;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://project--fd87e337-5eb6-4095-bf49-0a3f52f40e19.lovable.app/api/public/order-status-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || svc
      ),
      body := jsonb_build_object('orderId', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_order_delivered failed: %', SQLERRM;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS orders_notify_delivered ON public.orders;
CREATE TRIGGER orders_notify_delivered
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_delivered();
