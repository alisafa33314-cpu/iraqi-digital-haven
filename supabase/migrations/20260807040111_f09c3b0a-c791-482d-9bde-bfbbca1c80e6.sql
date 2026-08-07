CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    IF public.notify_enabled('notify_admin_telegram') THEN
      PERFORM net.http_post(
        url := 'https://project--fd87e337-5eb6-4095-bf49-0a3f52f40e19.lovable.app/api/public/new-order-telegram',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('orderId', NEW.id)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_order telegram failed order=% error=%', NEW.id, SQLERRM;
  END;

  BEGIN
    IF public.notify_enabled('notify_admin_whatsapp') THEN
      PERFORM public.whatsapp_notify_order(NEW.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_order whatsapp failed order=% error=%', NEW.id, SQLERRM;
  END;

  BEGIN
    IF public.notify_enabled('notify_admin_email') THEN
      PERFORM net.http_post(
        url := 'https://project--fd87e337-5eb6-4095-bf49-0a3f52f40e19.lovable.app/api/public/new-order-email',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('orderId', NEW.id)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_order email failed order=% error=%', NEW.id, SQLERRM;
  END;

  RETURN NULL;
END;
$function$;