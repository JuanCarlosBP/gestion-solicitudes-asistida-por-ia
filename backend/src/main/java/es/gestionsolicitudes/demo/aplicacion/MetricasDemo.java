package es.gestionsolicitudes.demo.aplicacion;

import es.gestionsolicitudes.demo.configuracion.PropiedadesDemo;
import java.lang.management.BufferPoolMXBean;
import java.lang.management.ManagementFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Medidas JVM opcionales del ensayo. No publica endpoint ni identificadores de visitantes. */
@Component
@Profile("demo")
public class MetricasDemo {
    private final PropiedadesDemo propiedades;

    public MetricasDemo(PropiedadesDemo propiedades) {
        this.propiedades = propiedades;
    }

    @Scheduled(fixedDelayString = "#{@propiedadesDemo.metricasMilisegundos()}")
    public void registrar() {
        if (!propiedades.metricasHabilitadas()) return;
        var memoria = ManagementFactory.getMemoryMXBean();
        var heap = memoria.getHeapMemoryUsage();
        var noHeap = memoria.getNonHeapMemoryUsage();
        long directo = 0;
        long mapeado = 0;
        for (var pool : ManagementFactory.getPlatformMXBeans(BufferPoolMXBean.class)) {
            if (pool.getName().equals("direct")) directo = pool.getMemoryUsed();
            if (pool.getName().equals("mapped")) mapeado = pool.getMemoryUsed();
        }
        System.getLogger(MetricasDemo.class.getName())
                .log(
                        System.Logger.Level.INFO,
                        "DEMO_METRICAS instante_ms="
                                + System.currentTimeMillis()
                                + " heap_usada="
                                + heap.getUsed()
                                + " heap_comprometida="
                                + heap.getCommitted()
                                + " heap_maxima="
                                + heap.getMax()
                                + " no_heap_usada="
                                + noHeap.getUsed()
                                + " directa="
                                + directo
                                + " mapeada="
                                + mapeado
                                + " hilos="
                                + ManagementFactory.getThreadMXBean().getThreadCount());
    }
}
