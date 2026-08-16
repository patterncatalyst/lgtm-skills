import jakarta.enterprise.context.ApplicationScoped;
import org.apache.camel.builder.RouteBuilder;

@ApplicationScoped
public class MyRoute extends RouteBuilder {

    @Override
    public void configure() throws Exception {
        errorHandler(deadLetterChannel("kafka:{{route.dlq-topic}}")
            .maximumRedeliveries(3)
            .redeliveryDelay(1000)
            .useOriginalMessage());

        from("kafka:{{route.input-topic}}?groupId={{route.group-id}}")
            .routeId("my-route")
            .log("Processing: ${header.kafka.KEY}")
            .bean(MyProcessor.class, "process")
            .to("kafka:{{route.output-topic}}");
    }
}
