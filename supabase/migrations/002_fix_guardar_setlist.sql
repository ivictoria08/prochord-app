-- Ejecutar en el SQL Editor sobre el proyecto existente.
-- Solo reemplaza la función; no ejecuta el guardado ni borra datos al aplicarse.
begin;

create or replace function public.guardar_setlist(canciones_ids integer[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_administrador() then
    raise exception 'No tienes permisos de administrador.' using errcode = '42501';
  end if;
  if canciones_ids is null or cardinality(canciones_ids) > 500
     or coalesce(array_ndims(canciones_ids), 1) <> 1
     or exists (select 1 from unnest(canciones_ids) as ids(id) where id is null or id <= 0) then
    raise exception 'Envía una lista de hasta 500 IDs positivos.' using errcode = '22023';
  end if;
  if (select count(distinct id) from unnest(canciones_ids) as ids(id)) <> cardinality(canciones_ids) then
    raise exception 'No repitas canciones en el setlist.' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(752041);
  if (select count(*) from public.canciones where id = any(canciones_ids)) <> cardinality(canciones_ids) then
    raise exception 'Una o más canciones no existen.' using errcode = '22023';
  end if;
  -- orden tiene CHECK (orden > 0): el filtro incluye todas las filas válidas.
  delete from public.setlist where orden > 0;
  insert into public.setlist (cancion_id, orden)
    select id, posicion::integer from unnest(canciones_ids) with ordinality as ids(id, posicion);
end;
$$;

revoke all on function public.guardar_setlist(integer[]) from public, anon;
grant execute on function public.guardar_setlist(integer[]) to authenticated;

commit;
