-- Add admin read policy to profiles
create policy "Admins can select all profiles"
on public.profiles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role));

-- Add foreign key from user_roles.user_id to profiles.id
alter table public.user_roles
add constraint fk_user_roles_user_profile
foreign key (user_id) references public.profiles(id) on delete cascade;

-- Add index for better join performance
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);