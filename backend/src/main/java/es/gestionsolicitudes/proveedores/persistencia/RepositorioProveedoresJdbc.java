package es.gestionsolicitudes.proveedores.persistencia;

import es.gestionsolicitudes.proveedores.aplicacion.RepositorioProveedores;
import es.gestionsolicitudes.proveedores.dominio.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RepositorioProveedoresJdbc implements RepositorioProveedores {
    private static final String COLUMNAS =
            "id,tipo,denominacion,pais_fiscal,identificador_fiscal,correo_contacto,telefono_contacto,activo,version,creado_en,actualizado_en";
    private final JdbcTemplate jdbc;

    public RepositorioProveedoresJdbc(DataSource fuente) {
        this.jdbc = new JdbcTemplate(fuente);
    }

    @Override
    public void insertar(Proveedor proveedor) {
        var datos = proveedor.datos();
        jdbc.update(
                "INSERT INTO gestion.proveedores ("
                        + COLUMNAS
                        + ",identificador_fiscal_normalizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                proveedor.id(),
                datos.tipo().name(),
                datos.denominacion(),
                datos.paisFiscal(),
                datos.identificadorFiscal(),
                datos.correoContacto(),
                datos.telefonoContacto(),
                proveedor.activo(),
                proveedor.version(),
                Timestamp.from(proveedor.creadoEn()),
                Timestamp.from(proveedor.actualizadoEn()),
                datos.fiscalNormalizado());
    }

    @Override
    public Optional<Proveedor> buscar(UUID id, boolean bloquear) {
        return jdbc
                .query(
                        "SELECT "
                                + COLUMNAS
                                + " FROM gestion.proveedores WHERE id=?"
                                + (bloquear ? " FOR UPDATE" : ""),
                        RepositorioProveedoresJdbc::mapear,
                        id)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<Proveedor> modificar(
            UUID id, long version, DatosProveedor datos, Instant ahora) {
        return jdbc
                .query(
                        "UPDATE gestion.proveedores SET tipo=?,denominacion=?,pais_fiscal=?,identificador_fiscal=?,identificador_fiscal_normalizado=?,correo_contacto=?,telefono_contacto=?,version=version+1,actualizado_en=? WHERE id=? AND version=? RETURNING "
                                + COLUMNAS,
                        RepositorioProveedoresJdbc::mapear,
                        datos.tipo().name(),
                        datos.denominacion(),
                        datos.paisFiscal(),
                        datos.identificadorFiscal(),
                        datos.fiscalNormalizado(),
                        datos.correoContacto(),
                        datos.telefonoContacto(),
                        Timestamp.from(ahora),
                        id,
                        version)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<Proveedor> cambiarEstado(UUID id, long version, boolean activo, Instant ahora) {
        return jdbc
                .query(
                        "UPDATE gestion.proveedores SET activo=?,version=version+1,actualizado_en=? WHERE id=? AND version=? RETURNING "
                                + COLUMNAS,
                        RepositorioProveedoresJdbc::mapear,
                        activo,
                        Timestamp.from(ahora),
                        id,
                        version)
                .stream()
                .findFirst();
    }

    @Override
    public PaginaProveedores listar(ConsultaProveedores consulta) {
        StringBuilder donde = new StringBuilder(" FROM gestion.proveedores WHERE true");
        List<Object> parametros = new ArrayList<>();
        if (consulta.activo() != null)
            agregar(donde, parametros, " AND activo=?", consulta.activo());
        if (consulta.denominacion() != null)
            agregar(
                    donde,
                    parametros,
                    " AND lower(denominacion) LIKE lower(?) ESCAPE '!'",
                    "%" + escapar(consulta.denominacion()) + "%");
        if (consulta.fiscalNormalizado() != null)
            agregar(
                    donde,
                    parametros,
                    " AND identificador_fiscal_normalizado=?",
                    consulta.fiscalNormalizado());
        if (consulta.tipo() != null)
            agregar(donde, parametros, " AND tipo=?", consulta.tipo().name());
        if (consulta.paisFiscal() != null)
            agregar(donde, parametros, " AND pais_fiscal=?", consulta.paisFiscal());
        Long total =
                jdbc.queryForObject("SELECT count(*)" + donde, Long.class, parametros.toArray());
        long cantidad = total == null ? 0 : total;
        String columna =
                switch (consulta.orden()) {
                    case DENOMINACION -> "denominacion";
                    case CREADO_EN -> "creado_en";
                    case ACTUALIZADO_EN -> "actualizado_en";
                };
        parametros.add(consulta.tamano());
        parametros.add((long) consulta.pagina() * consulta.tamano());
        List<Proveedor> elementos =
                jdbc.query(
                        "SELECT "
                                + COLUMNAS
                                + donde
                                + " ORDER BY "
                                + columna
                                + (consulta.descendente() ? " DESC" : " ASC")
                                + ", id ASC LIMIT ? OFFSET ?",
                        RepositorioProveedoresJdbc::mapear,
                        parametros.toArray());
        return new PaginaProveedores(
                elementos,
                consulta.pagina(),
                consulta.tamano(),
                cantidad,
                (cantidad + consulta.tamano() - 1) / consulta.tamano());
    }

    private static void agregar(
            StringBuilder donde, List<Object> parametros, String sql, Object valor) {
        donde.append(sql);
        parametros.add(valor);
    }

    private static String escapar(String valor) {
        return valor.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    private static Proveedor mapear(ResultSet fila, int numero) throws SQLException {
        return new Proveedor(
                fila.getObject("id", UUID.class),
                new DatosProveedor(
                        TipoProveedor.valueOf(fila.getString("tipo")),
                        fila.getString("denominacion"),
                        fila.getString("pais_fiscal"),
                        fila.getString("identificador_fiscal"),
                        fila.getString("correo_contacto"),
                        fila.getString("telefono_contacto")),
                fila.getBoolean("activo"),
                fila.getLong("version"),
                fila.getTimestamp("creado_en").toInstant(),
                fila.getTimestamp("actualizado_en").toInstant());
    }
}
