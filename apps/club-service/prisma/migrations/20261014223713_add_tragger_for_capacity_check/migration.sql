-- This is an empty migration.


CREATE OR REPLACE FUNCTION check_session_capacity() RETURNS trigger AS $$
DECLARE cap int; n int;
BEGIN
  SELECT capacity INTO cap FROM sessions WHERE id = NEW.session_id FOR UPDATE;
  SELECT count(*) INTO n FROM session_attends WHERE session_id = NEW.session_id;
  IF n >= cap THEN
    RAISE EXCEPTION 'session % is full', NEW.session_id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER session_attends_capacity_trg
  BEFORE INSERT ON session_attends
  FOR EACH ROW EXECUTE FUNCTION check_session_capacity();