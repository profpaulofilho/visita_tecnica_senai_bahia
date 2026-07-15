-- Seed dos 7 especialistas com senha temporária (hash bcrypt).
-- Rodar depois de aplicar schema.sql.

insert into especialistas (id, nome, email, senha_hash, precisa_trocar_senha) values ('ESP001', 'Paulo Filho', 'paulo.filho@senaiba.local', '$2a$10$00g.Bnp3K3JZWPivdSAZUO3OMliiB8S2QCT19MTohdf86tg1NWijq', true) on conflict (id) do nothing;
insert into especialistas (id, nome, email, senha_hash, precisa_trocar_senha) values ('ESP002', 'Felipe dos Anjos', 'felipe.anjos@senaiba.local', '$2a$10$ZzQ6e3ER1XakejXUwOCiGO0oIinWdOOX2lhb92ry3FSThm/w2U2yi', true) on conflict (id) do nothing;
insert into especialistas (id, nome, email, senha_hash, precisa_trocar_senha) values ('ESP003', 'Joilma Chaves', 'joilma.chaves@senaiba.local', '$2a$10$UDe/1aPH.hBlbPrjnmtyT.1EW/jQrQlXAJLCruwY663e31XSzCS2.', true) on conflict (id) do nothing;
insert into especialistas (id, nome, email, senha_hash, precisa_trocar_senha) values ('ESP004', 'Verônica', 'veronica@senaiba.local', '$2a$10$romBoBBFWzdhLuYtPDOPxeGSLz9pqRvT50PMeRRs1r2mswknbqB8e', true) on conflict (id) do nothing;
insert into especialistas (id, nome, email, senha_hash, precisa_trocar_senha) values ('ESP005', 'Lígia', 'ligia@senaiba.local', '$2a$10$udOdWFgevoIOE16e8gEwBu6lSrBHBRWNY1OOEU4BOgNij7Gci.eSu', true) on conflict (id) do nothing;
insert into especialistas (id, nome, email, senha_hash, precisa_trocar_senha) values ('ESP006', 'Juliana Neri', 'juliana.neri@senaiba.local', '$2a$10$e8MVzDXbIJypA/Gzjz7Ppud/oPwq6UBCgC89d7WnhdsZDtk5CkdCW', true) on conflict (id) do nothing;
insert into especialistas (id, nome, email, senha_hash, precisa_trocar_senha) values ('ESP007', 'Marcos Paulo', 'marcos.paulo@senaiba.local', '$2a$10$kFfGV2Kk/LiPOl5EeKAZKeCH37kOUH/UDH/KRWL/IrhebdcWt3gbG', true) on conflict (id) do nothing;
